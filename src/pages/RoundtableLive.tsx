import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  AudioLines,
  CheckCircle2,
  Mic,
  Signal,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  createLevelMonitor,
  microphoneSupported,
  requestMicrophone,
  stopStream,
  type LevelMonitor,
} from "../lib/audio";
import { wsBaseUrl } from "../lib/api";

type HostSession = {
  sessionId: string;
  hostToken: string;
  sessionName: string;
  maximumParticipants: number;
};

type ParticipantSession = {
  sessionId?: string | null;
  invitationToken?: string;
  requestId?: string;
  participantId?: string | null;
  participantToken?: string | null;
  displayName?: string;
  sessionName?: string | null;
};

type RoomParticipant = {
  id: string;
  name: string;
  energy: number;
  connected: boolean;
  last_seen: number;
};

type TranscriptLine = {
  participant_id: string;
  speaker: string;
  text: string;
  confidence: number;
  timestamp: number;
};

type RoomState = {
  participants: RoomParticipant[];
  active_speaker_id?: string | null;
  active_speaker_name?: string | null;
  transcript: TranscriptLine[];
};

type LiveSession = {
  sessionId: string;
  hostToken?: string;
  participantId?: string | null;
  participantToken?: string | null;
  displayName?: string;
  sessionName?: string | null;
  maximumParticipants?: number;
};

function readHostSession(): HostSession | null {
  try {
    const value = sessionStorage.getItem("roundtable.hostSession");
    return value ? (JSON.parse(value) as HostSession) : null;
  } catch {
    return null;
  }
}

function readParticipantSession(): ParticipantSession | null {
  try {
    const value = sessionStorage.getItem("roundtable.participantSession");
    return value ? (JSON.parse(value) as ParticipantSession) : null;
  } catch {
    return null;
  }
}

export default function RoundtableLive() {
  const location = useLocation();
  const navigate = useNavigate();
  const hostSession = readHostSession();
  const participantSession = readParticipantSession();
  const stateSession = (location.state as { session?: LiveSession } | null)?.session;

  const derivedSession = (stateSession ?? hostSession ?? participantSession ?? null) as LiveSession | null;
  const finalSession = derivedSession && derivedSession.sessionId
    ? {
        sessionId: derivedSession.sessionId,
        hostToken: derivedSession.hostToken,
        participantId: derivedSession.participantId,
        participantToken: derivedSession.participantToken,
        displayName: derivedSession.displayName,
        sessionName: derivedSession.sessionName,
        maximumParticipants: derivedSession.maximumParticipants,
      }
    : null;

  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");
  const [roomError, setRoomError] = useState("");
  const [micReady, setMicReady] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const monitorRef = useRef<LevelMonitor | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!finalSession?.sessionId) {
      navigate("/join", { replace: true });
      return;
    }

    const params = new URLSearchParams();
    if (finalSession.participantId) params.set("participant_id", finalSession.participantId);
    if (finalSession.participantToken) params.set("participant_token", finalSession.participantToken);
    if (finalSession.hostToken) params.set("host_token", finalSession.hostToken);
    if (finalSession.displayName) params.set("display_name", finalSession.displayName);

    const ws = new WebSocket(`${wsBaseUrl()}/ws/sessions/${finalSession.sessionId}?${params.toString()}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("connected");
    };

    ws.onclose = (event: CloseEvent) => {
      // Auth rejections are final: 4404 = unknown session (e.g. backend
      // restarted and dropped its in-memory store), 4401 = bad credentials.
      // Anything else is transient (see ws.onerror for the retry message).
      if (event.code === 4404) {
        setWsStatus("disconnected");
        setRoomError("This session no longer exists on the server. Create a new session or rejoin with a fresh invitation.");
      } else if (event.code === 4401) {
        setWsStatus("disconnected");
        setRoomError("Your access to this session is no longer valid. Rejoin with a fresh invitation.");
      } else {
        setWsStatus("disconnected");
      }
    };

    ws.onerror = () => {
      setWsStatus("error");
      setRoomError("The room connection dropped. Refresh to reconnect.");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as { type?: string; payload?: RoomState };
        if (message.type !== "room_state" || !message.payload) return;
        setParticipants(message.payload.participants ?? []);
        setActiveSpeaker(message.payload.active_speaker_name ?? null);
        setTranscript(message.payload.transcript ?? []);
      } catch {
        setRoomError("The live room sent an unreadable update.");
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      stopStream(streamRef.current);
      streamRef.current = null;
      monitorRef.current?.dispose();
      monitorRef.current = null;
    };
  }, [finalSession?.sessionId, finalSession?.hostToken, finalSession?.participantId, finalSession?.participantToken, finalSession?.displayName, navigate]);

  useEffect(() => {
    if (wsStatus !== "connected") return;
    if (!microphoneSupported()) {
      setRoomError("This browser cannot access the microphone required for the live Roundtable.");
      return;
    }

    async function startCapture() {
      try {
        const stream = await requestMicrophone();
        streamRef.current = stream;
        const monitor = createLevelMonitor(stream);
        monitorRef.current = monitor;

        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";

        const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : undefined);
        recorderRef.current = recorder;

        recorder.ondataavailable = async (event) => {
          if (!event.data || event.data.size === 0) return;
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

          const arrayBuffer = await event.data.arrayBuffer();
          const bytes = Array.from(new Uint8Array(arrayBuffer));
          const base64 = btoa(String.fromCharCode(...bytes.map((byte) => byte & 0xff)));
          const energy = monitorRef.current?.getLevel() ?? 0;

          wsRef.current.send(
            JSON.stringify({
              type: "audio",
              participant_id: finalSession?.participantId ?? "host",
              participant_token: finalSession?.participantToken ?? undefined,
              host_token: finalSession?.hostToken ?? undefined,
              display_name: finalSession?.displayName ?? finalSession?.sessionName ?? "Guest",
              energy,
              timestamp_ms: Date.now(),
              duration_ms: event.data.size,
              payload: base64,
            })
          );
        };

        recorder.start(350);
        setMicReady(true);
      } catch {
        setRoomError("Microphone access was denied or unavailable. Reopen the microphone test and try again.");
      }
    }

    void startCapture();

    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      stopStream(streamRef.current);
      streamRef.current = null;
      monitorRef.current?.dispose();
      monitorRef.current = null;
      setMicReady(false);
    };
  }, [wsStatus, finalSession?.participantId, finalSession?.participantToken, finalSession?.hostToken, finalSession?.displayName, finalSession?.sessionName]);

  const label = finalSession?.displayName || finalSession?.sessionName || "Session";

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#111111]">
      <Navbar />
      <main className="mx-auto max-w-[1280px] px-5 pb-24 pt-[120px] md:px-8 md:pt-[150px]">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#E4E4E0] bg-white px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#666]">
                <span className="h-[7px] w-[7px] rounded-full bg-[#18A874]" />
                Live Roundtable
              </p>
              <h1 className="editorial-tight mt-5 text-[38px] font-[700] sm:text-[56px]">
                {finalSession?.sessionName ?? "Active session"}
              </h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[#E4E4E0] bg-white px-4 py-2 text-[12px] font-medium text-[#666]">
              {wsStatus === "connected" ? <Wifi className="h-4 w-4 text-[#18A874]" /> : <WifiOff className="h-4 w-4 text-[#8A8A86]" />}
              {wsStatus === "connected" ? "Room connected" : wsStatus === "connecting" ? "Connecting…" : wsStatus === "error" ? "Connection error" : "Disconnected"}
            </div>
          </div>

          {roomError && (
            <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
              {roomError}
            </div>
          )}

          <div className="mt-8 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[24px] border border-[#E4E4E0] bg-white p-5 shadow-[0_16px_48px_rgba(0,0,0,0.04)] sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8A86]">Participants</p>
                  <h2 className="mt-2 text-[24px] font-bold">Audio network</h2>
                </div>
                <div className="grid h-10 min-w-10 place-items-center rounded-full bg-[#EAE8FF] px-2 font-mono text-[12px] font-bold text-[#635BFF]">
                  {participants.length}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {participants.length ? (
                  participants.map((participant) => {
                    const isActive = participant.id === activeSpeaker;
                    return (
                      <div
                        key={participant.id}
                        className={`rounded-2xl border p-3 transition ${isActive ? "border-[#635BFF] bg-[#F3F1FF]" : "border-[#E4E4E0] bg-[#F7F7F5]"}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-[11px] font-bold text-[#635BFF]">
                              {participant.name.slice(0, 2).toUpperCase()}
                            </span>
                            <div>
                              <p className="text-[14px] font-semibold">{participant.name}</p>
                              <p className="text-[11px] text-[#666]">
                                {participant.connected ? "Connected" : "Offline"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isActive && <Signal className="h-4 w-4 text-[#18A874]" />}
                            <span className="font-mono text-[11px] text-[#666]">{Math.round(participant.energy * 100)}%</span>
                          </div>
                        </div>
                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/80">
                          <div
                            className={`h-full rounded-full ${isActive ? "bg-[#18A874]" : "bg-[#635BFF]"}`}
                            style={{ width: `${Math.min(100, Math.max(6, participant.energy * 100))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#E4E4E0] p-5 text-[13px] text-[#8A8A86]">
                    Waiting for participants to join the room.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[24px] border border-[#E4E4E0] bg-white p-5 shadow-[0_16px_48px_rgba(0,0,0,0.04)] sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8A86]">Room status</p>
                  <h2 className="mt-2 text-[24px] font-bold">Live transcript</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#E4E4E0] bg-[#F7F7F5] px-3 py-1.5 text-[11px] font-medium text-[#666]">
                  {activeSpeaker ? <AudioLines className="h-3.5 w-3.5 text-[#18A874]" /> : <Mic className="h-3.5 w-3.5 text-[#8A8A86]" />}
                  {activeSpeaker ? `${activeSpeaker} speaking` : "Listening"}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-2 rounded-2xl bg-[#18A874]/10 px-4 py-3 text-[14px] font-medium text-[#0D4D36]">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {micReady ? "Microphone is live and sending audio energy readings to the backend." : "Waiting for microphone capture to start."}
                </div>

                {transcript.length ? (
                  transcript.slice().reverse().map((line, index) => (
                    <div key={`${line.speaker}-${line.timestamp}-${index}`} className="rounded-2xl border border-[#E4E4E0] bg-[#F7F7F5] p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold text-[#111]">{line.speaker}</p>
                        <span className="font-mono text-[10px] text-[#8A8A86]">{Math.round(line.confidence * 100)}%</span>
                      </div>
                      <p className="mt-2 text-[15px] leading-relaxed text-[#333]">{line.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#E4E4E0] p-5 text-[13px] text-[#8A8A86]">
                    The strongest connected microphone will appear here as the active speaker stream stabilizes.
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E4E4E0] bg-white p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A8A86]">Identity</p>
              <p className="mt-2 text-[18px] font-semibold">{label}</p>
            </div>
            <div className="rounded-2xl border border-[#E4E4E0] bg-white p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A8A86]">Latency model</p>
              <p className="mt-2 text-[18px] font-semibold">Draft {'<'} 500ms</p>
            </div>
            <div className="rounded-2xl border border-[#E4E4E0] bg-white p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A8A86]">Problem focus</p>
              <p className="mt-2 text-[18px] font-semibold">Signal fusion</p>
            </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
