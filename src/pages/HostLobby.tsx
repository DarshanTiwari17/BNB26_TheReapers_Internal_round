import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import {
  Check,
  Clipboard,
  Copy,
  ExternalLink,
  Lock,
  LockOpen,
  Play,
  RefreshCw,
  Share2,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  approveJoinRequest,
  createInvitation,
  getLobby,
  type ApiError,
  type CreatedSession,
  type Invitation,
  type Lobby,
  lockSession,
  publicInvitationUrl,
  regenerateInvitation,
  rejectJoinRequest,
  removeParticipant,
  startSession,
  unlockSession,
} from "../lib/api";

type HostSession = {
  sessionId: string;
  hostToken: string;
  sessionName: string;
  maximumParticipants: number;
};

function readStoredSession(): HostSession | null {
  try {
    const value = sessionStorage.getItem("roundtable.hostSession");
    return value ? (JSON.parse(value) as HostSession) : null;
  } catch {
    return null;
  }
}

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  return `${Math.floor(safeSeconds / 60).toString().padStart(2, "0")}:${(safeSeconds % 60).toString().padStart(2, "0")}`;
}

function apiMessage(error: unknown) {
  const apiError = error as ApiError;
  if (apiError.code === "session_full") return "The session is full. The backend rejected this action.";
  if (apiError.code === "session_locked") return "The session is locked. Unlock it before accepting new participants.";
  if (apiError.code === "invitation_expired") return "This invitation has expired. Generate a new QR code.";
  return error instanceof Error ? error.message : "The action could not be completed.";
}

export default function HostLobby() {
  const location = useLocation();
  const navigate = useNavigate();
  const stateSession = (location.state as { session?: HostSession } | null)?.session;
  const session = stateSession ?? readStoredSession();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const invitationExpired = !invitation || remainingSeconds <= 0 || !invitation.active;
  const isLocked = lobby?.status === "LOCKED";
  const isFull = lobby?.status === "FULL";
  const canStart = Boolean(lobby && lobby.status !== "STARTED" && lobby.status !== "STARTING");

  async function loadLobby(showLoading = false) {
    if (!session) return;
    if (showLoading) setLoading(true);
    try {
      const current = await getLobby(session.sessionId, session.hostToken);
      setLobby(current);
      setInvitation(current.invitation);
      if (!current.invitation && current.status !== "STARTED") {
        const created = await createInvitation(session.sessionId, session.hostToken);
        setInvitation(created);
      }
      setError("");
    } catch (loadError) {
      setError(apiMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLobby(true);
  }, [session?.sessionId, session?.hostToken]);

  useEffect(() => {
    if (!session) return;
    const interval = window.setInterval(() => void loadLobby(), 5000);
    return () => window.clearInterval(interval);
  }, [session?.sessionId, session?.hostToken]);

  useEffect(() => {
    if (!invitation) {
      setRemainingSeconds(0);
      return;
    }
    const update = () => setRemainingSeconds(Math.max(0, Math.ceil((Date.parse(invitation.expires_at) - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [invitation?.token, invitation?.expires_at]);

  const invitationLabel = useMemo(() => {
    if (invitationExpired) return "QR expired";
    return `Expires in ${formatCountdown(remainingSeconds)}`;
  }, [invitationExpired, remainingSeconds]);

  if (!session) return <Navigate to="/create-session" replace />;

  async function performAction(key: string, action: () => Promise<Lobby | void>) {
    setWorking(key);
    setError("");
    try {
      const updated = await action();
      if (updated) {
        setLobby(updated);
        setInvitation(updated.invitation);
      }
    } catch (actionError) {
      setError(apiMessage(actionError));
      await loadLobby();
    } finally {
      setWorking(null);
    }
  }

  async function regenerate() {
    if (isLocked || isFull) return;
    setWorking("regenerate");
    setError("");
    try {
      const next = await regenerateInvitation(session!.sessionId, session!.hostToken);
      setInvitation(next);
    } catch (actionError) {
      setError(apiMessage(actionError));
    } finally {
      setWorking(null);
    }
  }

  async function copyLink() {
    if (!invitation || invitationExpired) return;
    try {
      await navigator.clipboard.writeText(publicInvitationUrl(invitation.invitation_url));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard access is unavailable. Select and copy the invitation link manually.");
    }
  }

  async function shareLink() {
    if (!invitation || invitationExpired) return;
    if (navigator.share) {
      await navigator.share({ title: session!.sessionName, text: "Join my Roundtable session", url: publicInvitationUrl(invitation.invitation_url) });
    } else {
      await copyLink();
    }
  }

  async function startMeeting() {
    await performAction("start", async () => {
      const updated = await startSession(session!.sessionId, session!.hostToken);
      const hostState = {
        sessionId: session!.sessionId,
        hostToken: session!.hostToken,
        displayName: "Host",
        sessionName: session!.sessionName,
        role: "host" as const,
      };
      navigate("/roundtable", { state: { ...hostState, session: { ...hostState }, lobby: updated }, replace: true });
      return updated;
    });
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#111111]">
      <Navbar />
      <main className="mx-auto max-w-[1200px] px-5 pb-24 pt-[124px] md:px-8 md:pt-[148px]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#E4E4E0] bg-white px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#666]">
                <span className={`h-[7px] w-[7px] rounded-full ${isLocked || isFull ? "bg-[#635BFF]" : "bg-[#18A874]"}`} />
                Host · Session lobby
              </p>
              <h1 className="editorial-tight mt-5 break-words text-[40px] font-[700] sm:text-[58px]">{lobby?.name ?? session.sessionName}</h1>
              <p className="mt-3 text-[15px] text-[#666]">Session ID: <span className="font-mono text-[13px]">{session.sessionId}</span></p>
            </div>
            <div className="text-left md:text-right">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8A86]">Status</p>
              <p className="mt-2 text-[14px] font-bold tracking-[0.08em]">{lobby?.status ?? "LOADING"}</p>
            </div>
          </div>

          {error && <div role="alert" className="mt-7 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</div>}

          {loading && !lobby ? (
            <div className="mt-10 rounded-2xl border border-[#E4E4E0] bg-white p-8 text-[15px] text-[#666]">Loading your lobby...</div>
          ) : (
            <div className="mt-10 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
              <section className="rounded-2xl border border-[#E4E4E0] bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.04)] sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8A86]">Invite participants</p>
                    <h2 className="mt-2 text-[24px] font-bold">Scan to join the table.</h2>
                  </div>
                  <div className="rounded-full bg-[#EAE8FF] px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#635BFF]">5 min invite</div>
                </div>

                <div className="mt-7 flex flex-col items-center rounded-2xl border border-[#E4E4E0] bg-[#F7F7F5] px-5 py-7">
                  {invitation && !invitationExpired ? (
                    <QRCodeSVG value={publicInvitationUrl(invitation.invitation_url)} size={220} bgColor="#FFFFFF" fgColor="#111111" level="M" includeMargin />
                  ) : (
                    <div className="grid h-[220px] w-[220px] place-items-center border border-dashed border-[#C9C9C4] bg-white text-center">
                      <div><RefreshCw className="mx-auto h-7 w-7 text-[#635BFF]" /><p className="mt-3 text-[14px] font-semibold">QR expired</p><p className="mt-1 text-[12px] text-[#8A8A86]">Generate a new invitation.</p></div>
                    </div>
                  )}
                  <p className={`mt-5 font-mono text-[12px] uppercase tracking-[0.12em] ${invitationExpired ? "text-[#635BFF]" : "text-[#666]"}`}>{invitationLabel}</p>
                  <div className="mt-3 flex w-full max-w-[480px] items-center gap-2 rounded-xl border border-[#E4E4E0] bg-white px-3 py-2">
                    <ExternalLink className="h-4 w-4 shrink-0 text-[#8A8A86]" />
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#666]">{invitation ? publicInvitationUrl(invitation.invitation_url) : "No active invitation"}</span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button disabled={invitationExpired} onClick={() => void copyLink()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#111] px-5 py-3 text-[13px] font-semibold text-white transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"><Copy className="h-4 w-4" />{copied ? "Copied" : "Copy Link"}</button>
                  <button disabled={invitationExpired} onClick={() => void shareLink()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E4E4E0] px-5 py-3 text-[13px] font-semibold transition hover:-translate-y-[1px] hover:border-[#111] disabled:cursor-not-allowed disabled:opacity-40"><Share2 className="h-4 w-4" />Share</button>
                  <button disabled={working !== null || isLocked || isFull} onClick={() => void regenerate()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E4E4E0] px-5 py-3 text-[13px] font-semibold transition hover:-translate-y-[1px] hover:border-[#111] disabled:cursor-wait disabled:opacity-40"><RefreshCw className={`h-4 w-4 ${working === "regenerate" ? "animate-spin" : ""}`} />Regenerate QR</button>
                </div>
                <p className="mt-4 text-[12px] leading-relaxed text-[#8A8A86]">Regenerating immediately invalidates the previous QR code. The backend controls the expiration time.</p>
              </section>

              <div className="space-y-5">
                <section className="rounded-2xl border border-[#E4E4E0] bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.04)] sm:p-8">
                  <div className="flex items-end justify-between gap-4">
                    <div><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8A86]">Participants</p><p className="mt-2 text-[32px] font-bold tracking-[-0.04em]">{lobby?.participants.length ?? 0} <span className="text-[18px] text-[#8A8A86]">/ {lobby?.capacity ?? session.maximumParticipants}</span></p></div>
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-[#EDEDE9]"><div className="h-full rounded-full bg-[#635BFF] transition-all" style={{ width: `${Math.min(100, ((lobby?.participants.length ?? 0) / (lobby?.capacity ?? session.maximumParticipants)) * 100)}%` }} /></div>
                  </div>
                  <div className="mt-6 space-y-2">
                    {lobby?.participants.length ? lobby.participants.map((participant) => <div key={participant.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#F7F7F5] px-4 py-3"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#EAE8FF] text-[12px] font-bold text-[#635BFF]">{participant.display_name[0]?.toUpperCase()}</span><div><p className="text-[14px] font-semibold">{participant.display_name}</p><p className="flex items-center gap-1 text-[12px] text-[#18A874]"><span className="h-1.5 w-1.5 rounded-full bg-[#18A874]" />Connected</p></div></div><button disabled={working !== null} onClick={() => void performAction(`remove-${participant.id}`, () => removeParticipant(session.sessionId, participant.id, session.hostToken))} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#666] hover:text-red-600 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Remove</button></div>) : <p className="rounded-xl border border-dashed border-[#E4E4E0] px-4 py-5 text-[13px] text-[#8A8A86]">No approved participants yet.</p>}
                  </div>
                </section>

                <section className="rounded-2xl border border-[#E4E4E0] bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.04)] sm:p-8">
                  <div className="flex items-center justify-between gap-3"><div><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8A86]">Join requests</p><h2 className="mt-2 text-[20px] font-bold">Review people waiting.</h2></div><span className="grid h-8 min-w-8 place-items-center rounded-full bg-[#F7F7F5] px-2 font-mono text-[12px]">{lobby?.pending_requests.length ?? 0}</span></div>
                  <div className="mt-5 space-y-2">
                    {lobby?.pending_requests.length ? lobby.pending_requests.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E4E4E0] px-4 py-3"><div><p className="text-[14px] font-semibold">{request.display_name}</p><p className="text-[12px] text-[#8A8A86]">Wants to join</p></div><div className="flex gap-2"><button disabled={working !== null} onClick={() => void performAction(`reject-${request.id}`, () => rejectJoinRequest(session.sessionId, request.id, session.hostToken))} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[#E4E4E0] px-3 py-2 text-[12px] font-semibold hover:border-[#111] disabled:opacity-40"><UserX className="h-3.5 w-3.5" />Reject</button><button disabled={working !== null || isFull} onClick={() => void performAction(`approve-${request.id}`, () => approveJoinRequest(session.sessionId, request.id, session.hostToken))} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-[#111] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-40"><UserCheck className="h-3.5 w-3.5" />Approve</button></div></div>) : <p className="rounded-xl border border-dashed border-[#E4E4E0] px-4 py-5 text-[13px] text-[#8A8A86]">No pending requests.</p>}
                  </div>
                </section>
              </div>
            </div>
          )}

          <section className="mt-5 flex flex-col gap-4 rounded-2xl border border-[#E4E4E0] bg-white p-5 shadow-[0_16px_48px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div><p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8A86]">Host controls</p><p className="mt-2 text-[14px] text-[#666]">{isLocked ? "New participants can no longer join." : isFull ? "The participant limit has been reached." : "Manage access before starting the meeting."}</p></div>
            <div className="flex flex-wrap gap-2"><button disabled={working !== null || isFull || !lobby || lobby.status === "STARTED"} onClick={() => void performAction(isLocked ? "unlock" : "lock", () => isLocked ? unlockSession(session.sessionId, session.hostToken) : lockSession(session.sessionId, session.hostToken))} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E4E4E0] px-5 py-3 text-[13px] font-semibold hover:border-[#111] disabled:cursor-not-allowed disabled:opacity-40">{isLocked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}{isLocked ? "Unlock Session" : "Lock Session"}</button><button disabled={working !== null || !canStart} onClick={() => void startMeeting()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#111] px-5 py-3 text-[13px] font-semibold text-white hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-40"><Play className="h-4 w-4" />{working === "start" ? "Starting..." : "Start Meeting"}</button></div>
          </section>

          <div className="mt-7 flex items-center justify-between border-t border-[#E4E4E0] pt-5"><Link to="/" className="text-[13px] font-medium text-[#666] hover:text-[#111]">Back to Roundtable</Link><span className="flex items-center gap-2 text-[12px] text-[#8A8A86]"><Clipboard className="h-3.5 w-3.5" />Auto-refreshing lobby</span></div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
