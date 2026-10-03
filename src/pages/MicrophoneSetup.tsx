import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Mic, MonitorSmartphone } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SetupProgress from "../components/mic/SetupProgress";
import ConnectionStatus from "../components/mic/ConnectionStatus";
import MicrophonePermission from "../components/mic/MicrophonePermission";
import MicrophoneSelector from "../components/mic/MicrophoneSelector";
import MicrophoneTest, { type MicTestState } from "../components/mic/MicrophoneTest";
import AudioLevelMeter from "../components/mic/AudioLevelMeter";
import SeatPositionSelector, { type SeatId } from "../components/mic/SeatPositionSelector";
import {
  classifyMicError,
  createLevelMonitor,
  listAudioInputs,
  microphoneSupported,
  requestMicrophone,
  stopStream,
  type LevelMonitor,
  type MicrophoneFailure,
} from "../lib/audio";

type ParticipantSession = {
  invitationToken?: string;
  requestId?: string;
  participantId?: string | null;
  participantToken?: string | null;
  displayName?: string;
  sessionName?: string | null;
};

type PermissionState = "unknown" | "requesting" | "granted" | MicrophoneFailure;

const TEST_DURATION_MS = 4000;
const PASS_THRESHOLD = 0.04;

function readParticipantSession(): ParticipantSession | null {
  try {
    const raw = sessionStorage.getItem("roundtable.participantSession");
    return raw ? (JSON.parse(raw) as ParticipantSession) : null;
  } catch {
    return null;
  }
}

export default function MicrophoneSetup() {
  const navigate = useNavigate();
  const [participant] = useState<ParticipantSession | null>(() => readParticipantSession());
  const [permission, setPermission] = useState<PermissionState>(() =>
    microphoneSupported() ? "unknown" : "unsupported"
  );
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [test, setTest] = useState<MicTestState>("idle");
  const [seat, setSeat] = useState<SeatId | null>(() => {
    try {
      return (sessionStorage.getItem("roundtable.seatPosition") as SeatId) || null;
    } catch {
      return null;
    }
  });
  const [seatSkipped, setSeatSkipped] = useState(false);
  const [disconnected, setDisconnected] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const monitorRef = useRef<LevelMonitor | null>(null);
  const testRaf = useRef(0);

  const getLevel = useCallback(() => monitorRef.current?.getLevel() ?? 0, []);

  /* Stop the local stream when the page is abandoned. */
  useEffect(() => {
    return () => {
      cancelAnimationFrame(testRaf.current);
      monitorRef.current?.dispose();
      monitorRef.current = null;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  const attachStream = useCallback(async (stream: MediaStream) => {
    monitorRef.current?.dispose();
    stopStream(streamRef.current);
    streamRef.current = stream;
    setDisconnected(false);
    try {
      monitorRef.current = createLevelMonitor(stream);
    } catch {
      monitorRef.current = null;
    }
    try {
      setDevices(await listAudioInputs());
    } catch {
      // Device list is a nicety — the stream itself is what matters.
    }
    stream.getTracks().forEach((track) => {
      track.onended = () => {
        if (streamRef.current === stream) setDisconnected(true);
      };
    });
  }, []);

  async function enableMicrophone(selectedDeviceId?: string | null) {
    setPermission("requesting");
    setTest((t) => (t === "passed" || t === "quiet" ? "idle" : t));
    try {
      const stream = await requestMicrophone(selectedDeviceId ?? undefined);
      await attachStream(stream);
      const inputs = await listAudioInputs().catch(() => [] as MediaDeviceInfo[]);
      const activeId = stream.getAudioTracks()[0]?.getSettings().deviceId ?? inputs[0]?.deviceId ?? null;
      setDeviceId(activeId);
      setPermission("granted");
    } catch (error) {
      stopStream(streamRef.current);
      streamRef.current = null;
      setPermission(classifyMicError(error));
    }
  }

  async function switchDevice(nextId: string) {
    setDeviceId(nextId);
    setTest("idle");
    try {
      const stream = await requestMicrophone(nextId);
      await attachStream(stream);
    } catch (error) {
      setPermission(classifyMicError(error));
    }
  }

  function startTest() {
    if (!monitorRef.current) return;
    setTest("testing");
    const samples: number[] = [];
    const started = performance.now();
    const collect = () => {
      samples.push(monitorRef.current?.getLevel() ?? 0);
      if (performance.now() - started >= TEST_DURATION_MS) {
        const peak = samples.reduce((max, v) => Math.max(max, v), 0);
        setTest(peak >= PASS_THRESHOLD ? "passed" : "quiet");
        return;
      }
      testRaf.current = requestAnimationFrame(collect);
    };
    testRaf.current = requestAnimationFrame(collect);
  }

  function chooseSeat(id: SeatId) {
    setSeat(id);
    try {
      sessionStorage.setItem("roundtable.seatPosition", id);
    } catch {
      // Optional preference — safe to ignore.
    }
  }

  // 01 microphone → 02 test → 03 position → 04 ready
  const stepIndex = permission !== "granted" ? 0 : test !== "passed" ? 1 : seat || seatSkipped ? 3 : 2;
  const ready = permission === "granted" && test === "passed" && !disconnected;

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#111111]">
      <Navbar />
      <main className="mx-auto w-full max-w-[600px] px-5 pb-24 pt-[120px] md:pt-[150px]">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#E4E4E0] bg-white px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#666]">
              <Mic className="h-3.5 w-3.5 text-[#635BFF]" /> Microphone setup
            </p>
            <h1 className="editorial-tight mt-5 text-[36px] font-[700] sm:text-[48px]">Let&apos;s connect your microphone.</h1>
            <p className="mx-auto mt-3 max-w-[460px] text-[15px] leading-relaxed text-[#666]">
              Your phone will act as one of the microphones helping Roundtable understand the conversation.
            </p>
            {participant?.sessionName && (
              <div className="mt-4">
                <ConnectionStatus sessionName={participant.sessionName} />
              </div>
            )}
          </div>

          <div className="mt-8 rounded-[24px] border border-[#E4E4E0] bg-white p-5 sm:p-7">
            <SetupProgress current={stepIndex} />

            <div className="mt-6" aria-live="polite">
              <AnimatePresence mode="wait">
                {!participant ? (
                  <motion.div
                    key="no-session"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-2xl border border-[#E4E4E0] p-6 text-center"
                  >
                    <h2 className="text-[18px] font-bold">Join a session first</h2>
                    <p className="mx-auto mt-2 max-w-[380px] text-[14px] leading-relaxed text-[#666]">
                      Microphone setup is for approved participants. Scan your host&apos;s QR code to join, then come back here.
                    </p>
                    <Link
                      to="/join"
                      className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#111111] px-7 py-3 text-[14px] font-semibold text-white transition hover:-translate-y-[1px]"
                    >
                      Go to Join Session
                    </Link>
                  </motion.div>
                ) : permission === "unsupported" ? (
                  <motion.div
                    key="unsupported"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-2xl border border-[#E4E4E0] p-6 text-center"
                  >
                    <MonitorSmartphone className="mx-auto h-8 w-8 text-[#8A8A86]" strokeWidth={1.6} />
                    <h2 className="mt-3 text-[18px] font-bold">This browser cannot access your microphone.</h2>
                    <p className="mx-auto mt-2 max-w-[380px] text-[14px] leading-relaxed text-[#666]">
                      Try a recent version of Chrome, Edge, Firefox, or Safari on your phone.
                    </p>
                  </motion.div>
                ) : permission !== "granted" ? (
                  <motion.div
                    key="permission"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                  >
                    <MicrophonePermission
                      state={permission === "requesting" ? "requesting" : permission === "unknown" ? "idle" : permission}
                      onAllow={() => void enableMicrophone(deviceId)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="setup"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    <div className="flex items-center gap-2 rounded-2xl bg-[#18A874]/10 px-4 py-3" role="status">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#18A874]" />
                      <p className="text-[14px] font-semibold">Microphone connected</p>
                    </div>

                    {disconnected && (
                      <div className="rounded-2xl border border-[#E8D9A8] bg-[#FDF6E3] p-4" role="alert">
                        <p className="text-[14px] font-semibold">Microphone disconnected.</p>
                        <button
                          type="button"
                          onClick={() => void enableMicrophone(deviceId)}
                          className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#111111] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:-translate-y-[1px]"
                        >
                          Reconnect
                        </button>
                      </div>
                    )}

                    <section aria-label="Choose your microphone">
                      <h2 className="text-[16px] font-bold tracking-[-0.01em]">Choose your microphone</h2>
                      <div className="mt-3">
                        <MicrophoneSelector devices={devices} selectedId={deviceId} onSelect={(id) => void switchDevice(id)} />
                      </div>
                      <div className="mt-4">
                        <AudioLevelMeter getLevel={getLevel} live />
                      </div>
                    </section>

                    <MicrophoneTest
                      state={test}
                      getLevel={getLevel}
                      onStart={startTest}
                      onRetry={() => {
                        setTest("idle");
                        startTest();
                      }}
                    />

                    {test === "passed" && (
                      <motion.section
                        aria-label="Where are you sitting?"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <h2 className="text-[16px] font-bold tracking-[-0.01em]">Where are you sitting?</h2>
                        <p className="mt-1 text-[14px] text-[#666]">
                          An approximate position can help Roundtable understand which microphone is closest to each speaker.
                        </p>
                        <div className="mt-4">
                          <SeatPositionSelector selected={seat} onSelect={chooseSeat} onSkip={() => setSeatSkipped(true)} />
                        </div>
                      </motion.section>
                    )}

                    {disconnected ? (
                      <p className="rounded-2xl border border-[#E4E4E0] p-4 text-center text-[13px] text-[#666]">
                        Reconnect your microphone to continue.
                      </p>
                    ) : null}

                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => navigate("/roundtable")}
                      className="group inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#111111] px-8 py-4 text-[15px] font-semibold text-white transition-all hover:-translate-y-[1px] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {ready ? (
                        <>
                          Ready — Enter Roundtable <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-[2px]" />
                        </>
                      ) : (
                        "Complete the microphone test to continue"
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <p className="mt-5 text-center text-[12px] leading-relaxed text-[#8A8A86]">
            {participant ? (
              <>Signed in as {participant.displayName ?? "participant"} · temporary access for this session only.</>
            ) : (
              <>No account needed — access is temporary for this session only.</>
            )}
          </p>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
