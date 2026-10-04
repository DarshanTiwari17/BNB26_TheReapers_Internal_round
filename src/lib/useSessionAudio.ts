import { useEffect, useRef, useState } from "react";
import {
  createLevelMonitor,
  listAudioInputs,
  requestMicrophone,
  stopStream,
  type LevelMonitor,
} from "./audio";
import { ParticipantAudioStreamManager } from "./participantAudio";

type SessionParticipant = {
  id: string;
  display_name: string;
  role: "host" | "participant";
};

type PeerSignal = {
  type: "peer_signal";
  from_id: string;
  signal_type: "offer" | "answer" | "candidate";
  signal: RTCSessionDescriptionInit | RTCIceCandidateInit;
};

type SessionSocket = WebSocket | null;
type AudioState = "connecting" | "connected" | "disconnected" | "reconnecting";
type MicrophoneState = "connected" | "muted" | "disconnected";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export function useSessionAudio(
  socket: SessionSocket,
  participants: SessionParticipant[],
  localParticipantId: string,
) {
  const [audioState, setAudioState] = useState<AudioState>("connecting");
  const [audioError, setAudioError] = useState<string | null>(null);
  const [micAttempt, setMicAttempt] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [streamVersion, setStreamVersion] = useState(0);
  const [peerStates, setPeerStates] = useState<Record<string, RTCPeerConnectionState>>({});
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [speakingPeerIds, setSpeakingPeerIds] = useState<string[]>([]);

  const socketRef = useRef<SessionSocket>(socket);
  const participantsRef = useRef(participants);
  const localParticipantIdRef = useRef(localParticipantId);
  const streamRef = useRef<MediaStream | null>(null);
  const monitorRef = useRef<LevelMonitor | null>(null);
  const remoteMonitorsRef = useRef(new Map<string, LevelMonitor>());
  const peerConnectionsRef = useRef(new Map<string, RTCPeerConnection>());
  // Central participantId -> MediaStream registry. The WebRTC layer writes
  // here; the future intelligence layer reads here. Never mixed, never keyed
  // by display name.
  const streamManagerRef = useRef<ParticipantAudioStreamManager | null>(null);
  if (!streamManagerRef.current) {
    streamManagerRef.current = new ParticipantAudioStreamManager();
  }
  const pendingCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>());
  const pendingSignalsRef = useRef<PeerSignal[]>([]);
  const offeredPeersRef = useRef(new Set<string>());
  const mutedRef = useRef(false);
  const localLevelRef = useRef(0);
  const remoteLevelsRef = useRef(new Map<string, number>());
  const animationFrameRef = useRef(0);
  const audioReadyRef = useRef(false);

  socketRef.current = socket;
  participantsRef.current = participants;
  localParticipantIdRef.current = localParticipantId;

  const sendPresence = (microphoneState: MicrophoneState) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "presence",
        connection_state: "connected",
        microphone_state: microphoneState,
      }));
    }
  };

  const sendSignal = (peerId: string, signalType: PeerSignal["signal_type"], signal: RTCSessionDescriptionInit | RTCIceCandidateInit) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "peer_signal",
        to_id: peerId,
        signal_type: signalType,
        signal,
      }));
    }
  };

  const bumpStreams = () => setStreamVersion((version) => version + 1);

  const closePeer = (peerId: string) => {
    const peer = peerConnectionsRef.current.get(peerId);
    if (peer) {
      peer.onicecandidate = null;
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      peer.close();
      peerConnectionsRef.current.delete(peerId);
    }
    remoteMonitorsRef.current.get(peerId)?.dispose();
    remoteMonitorsRef.current.delete(peerId);
    remoteLevelsRef.current.delete(peerId);
    pendingCandidatesRef.current.delete(peerId);
    offeredPeersRef.current.delete(peerId);
    streamManagerRef.current?.removeStream(peerId);
    bumpStreams();
    setRemoteStreams((existing) => {
      if (!(peerId in existing)) return existing;
      const next = { ...existing };
      delete next[peerId];
      return next;
    });
    setPeerStates((existing) => {
      if (!(peerId in existing)) return existing;
      const next = { ...existing };
      delete next[peerId];
      return next;
    });
  };

  const createPeer = (participant: SessionParticipant) => {
    const existing = peerConnectionsRef.current.get(participant.id);
    if (existing) return existing;

    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnectionsRef.current.set(participant.id, peer);
    streamRef.current?.getAudioTracks().forEach((track) => peer.addTrack(track, streamRef.current!));
    peer.onicecandidate = (event) => {
      if (event.candidate) sendSignal(participant.id, "candidate", event.candidate.toJSON());
    };
    peer.ontrack = (event) => {
      // The peer connection is created per participant, so the arriving
      // track belongs to that participantId — never inferred from audio.
      const remoteStream = event.streams[0] ?? new MediaStream([event.track]);
      remoteMonitorsRef.current.get(participant.id)?.dispose();
      try {
        remoteMonitorsRef.current.set(participant.id, createLevelMonitor(remoteStream));
      } catch {
        remoteMonitorsRef.current.delete(participant.id);
      }
      setRemoteStreams((existingStreams) => ({ ...existingStreams, [participant.id]: remoteStream }));
      streamManagerRef.current?.setStream(participant.id, remoteStream, false);
      bumpStreams();
    };
    peer.onconnectionstatechange = () => {
      setPeerStates((existingStates) => ({ ...existingStates, [participant.id]: peer.connectionState }));
      if (peer.connectionState === "failed") {
        setAudioError("Direct audio could not connect. This network may require a TURN relay.");
      }
    };
    return peer;
  };

  const flushCandidates = async (peerId: string, peer: RTCPeerConnection) => {
    const candidates = pendingCandidatesRef.current.get(peerId) ?? [];
    pendingCandidatesRef.current.delete(peerId);
    for (const candidate of candidates) {
      try {
        await peer.addIceCandidate(candidate);
      } catch {
        // Ignore stale candidates after a peer has restarted negotiation.
      }
    }
  };

  const processSignal = async (message: PeerSignal) => {
    if (!audioReadyRef.current) {
      pendingSignalsRef.current.push(message);
      return;
    }
    const participant = participantsRef.current.find((item) => item.id === message.from_id) ?? {
      id: message.from_id,
      display_name: "Participant",
      role: "participant" as const,
    };
    const peer = createPeer(participant);

    try {
      if (message.signal_type === "candidate") {
        const candidate = message.signal as RTCIceCandidateInit;
        if (peer.remoteDescription) {
          await peer.addIceCandidate(candidate);
        } else {
          const pending = pendingCandidatesRef.current.get(message.from_id) ?? [];
          pending.push(candidate);
          pendingCandidatesRef.current.set(message.from_id, pending);
        }
        return;
      }

      await peer.setRemoteDescription(message.signal as RTCSessionDescriptionInit);
      await flushCandidates(message.from_id, peer);
      if (message.signal_type === "offer") {
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        sendSignal(message.from_id, "answer", answer);
      }
    } catch {
      setAudioError("Could not establish an audio connection with a participant. Try reconnecting.");
    }
  };

  const handleSignal = (message: PeerSignal) => {
    void processSignal(message);
  };

  const syncPeers = async (availableParticipants: SessionParticipant[]) => {
    if (!audioReadyRef.current) return;
    const remoteParticipants = availableParticipants.filter((item) => item.id !== localParticipantIdRef.current);
    const activeIds = new Set(remoteParticipants.map((item) => item.id));

    for (const peerId of peerConnectionsRef.current.keys()) {
      if (!activeIds.has(peerId)) closePeer(peerId);
    }

    for (const participant of remoteParticipants) {
      const peer = createPeer(participant);
      const isOfferer = localParticipantIdRef.current.localeCompare(participant.id) < 0;
      if (!isOfferer || offeredPeersRef.current.has(participant.id)) continue;
      offeredPeersRef.current.add(participant.id);
      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        sendSignal(participant.id, "offer", offer);
      } catch {
        offeredPeersRef.current.delete(participant.id);
        setAudioError(`Could not start audio with ${participant.display_name}.`);
      }
    }
  };

  useEffect(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    let active = true;
    const refreshDevices = () => {
      void listAudioInputs().then(setInputDevices).catch(() => undefined);
    };
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshDevices);

    const startMicrophone = async () => {
      try {
        const stream = await requestMicrophone(selectedDeviceId || undefined);
        if (!active) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        monitorRef.current = createLevelMonitor(stream);
        streamManagerRef.current?.setStream(localParticipantIdRef.current, stream, true);
        setLocalStream(stream);
        bumpStreams();
        audioReadyRef.current = true;
        setAudioState("connected");
        setAudioError(null);
        const devices = await listAudioInputs().catch(() => []);
        if (active) {
          setInputDevices(devices);
          const actualDeviceId = stream.getAudioTracks()[0]?.getSettings().deviceId;
          if (actualDeviceId) setSelectedDeviceId(actualDeviceId);
        }
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !mutedRef.current;
          track.onended = () => {
            if (!active) return;
            setAudioState("disconnected");
            setAudioError("Microphone disconnected. Reconnect it to send audio.");
            sendPresence("disconnected");
          };
        });
        sendPresence(mutedRef.current ? "muted" : "connected");
        await syncPeers(participantsRef.current);
        const queuedSignals = pendingSignalsRef.current.splice(0);
        for (const message of queuedSignals) await processSignal(message);

        const updateLevels = () => {
          localLevelRef.current = monitorRef.current?.getLevel() ?? 0;
          const localIsSpeaking = localLevelRef.current > 0.045;
          setLocalSpeaking((previous) => previous === localIsSpeaking ? previous : localIsSpeaking);
          remoteMonitorsRef.current.forEach((monitor, peerId) => {
            remoteLevelsRef.current.set(peerId, monitor.getLevel());
          });
          const activeSpeakers = [...remoteLevelsRef.current.entries()]
            .filter(([, level]) => level > 0.045)
            .map(([peerId]) => peerId)
            .sort();
          setSpeakingPeerIds((previous) =>
            previous.length === activeSpeakers.length && previous.every((peerId, index) => peerId === activeSpeakers[index])
              ? previous
              : activeSpeakers
          );
          animationFrameRef.current = requestAnimationFrame(updateLevels);
        };
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      } catch (captureError) {
        if (!active) return;
        setAudioState("disconnected");
        setAudioError(captureError instanceof Error ? captureError.message : "Microphone access was blocked. Re-enable it to join audio.");
        audioReadyRef.current = false;
        monitorRef.current?.dispose();
        monitorRef.current = null;
        stopStream(streamRef.current);
        streamRef.current = null;
      }
    };

    void startMicrophone();
    return () => {
      active = false;
      navigator.mediaDevices?.removeEventListener?.("devicechange", refreshDevices);
      cancelAnimationFrame(animationFrameRef.current);
      audioReadyRef.current = false;
      peerConnectionsRef.current.forEach((peer) => peer.close());
      peerConnectionsRef.current.clear();
      remoteMonitorsRef.current.forEach((monitor) => monitor.dispose());
      remoteMonitorsRef.current.clear();
      pendingCandidatesRef.current.clear();
      pendingSignalsRef.current = [];
      offeredPeersRef.current.clear();
      monitorRef.current?.dispose();
      monitorRef.current = null;
      stopStream(streamRef.current);
      streamRef.current = null;
      streamManagerRef.current?.clearAllStreams();
      setLocalStream(null);
      bumpStreams();
      setRemoteStreams({});
      setPeerStates({});
      localLevelRef.current = 0;
      setLocalSpeaking(false);
      setSpeakingPeerIds([]);
    };
  }, [socket, micAttempt]);

  useEffect(() => {
    if (audioReadyRef.current) void syncPeers(participants);
  }, [participants, socket]);

  const toggleMuted = () => {
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMicMuted(nextMuted);
    sendPresence(nextMuted ? "muted" : "connected");
  };

  const switchInput = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    let nextStream: MediaStream | null = null;
    try {
      nextStream = await requestMicrophone(deviceId || undefined);
      const nextTrack = nextStream.getAudioTracks()[0];
      if (!nextTrack) throw new Error("The selected input has no audio track.");
      nextTrack.enabled = !mutedRef.current;
      const replacements = [...peerConnectionsRef.current.values()].flatMap((peer) =>
        peer.getSenders()
          .filter((sender) => sender.track?.kind === "audio")
          .map((sender) => sender.replaceTrack(nextTrack))
      );
      await Promise.all(replacements);
      monitorRef.current?.dispose();
      stopStream(streamRef.current);
      streamRef.current = nextStream;
      monitorRef.current = createLevelMonitor(nextStream);
      streamManagerRef.current?.setStream(localParticipantIdRef.current, nextStream, true);
      setLocalStream(nextStream);
      bumpStreams();
      nextTrack.onended = () => {
        setAudioState("disconnected");
        setAudioError("Microphone disconnected. Reconnect it to send audio.");
        sendPresence("disconnected");
      };
      setAudioState("connected");
      setAudioError(null);
      sendPresence(mutedRef.current ? "muted" : "connected");
    } catch (switchError) {
      if (nextStream !== streamRef.current) stopStream(nextStream);
      setAudioError(switchError instanceof Error ? switchError.message : "Could not switch microphone input.");
      setSelectedDeviceId(streamRef.current?.getAudioTracks()[0]?.getSettings().deviceId ?? "");
    }
  };

  const retryMicrophone = () => setMicAttempt((attempt) => attempt + 1);

  return {
    audioState,
    audioError,
    retryMicrophone,
    micMuted,
    toggleMuted,
    inputDevices,
    selectedDeviceId,
    switchInput,
    remoteStreams,
    peerStates,
    localStream,
    streamVersion,
    streamManager: streamManagerRef.current as ParticipantAudioStreamManager,
    localSpeaking,
    speakingPeerIds,
    localLevelRef,
    remoteLevelsRef,
    handleSignal,
  };
}
