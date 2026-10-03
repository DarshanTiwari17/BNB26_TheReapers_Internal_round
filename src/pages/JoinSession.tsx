import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Loader2,
  Mic,
  RotateCcw,
  Users,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  getInvitationPreview,
  getJoinRequestStatus,
  requestToJoin,
  type ApiError,
  type InvitationPreview,
} from "../lib/api";
import { cn } from "../lib/utils";

/* ------------------------------------------------------------------ */
/* Explicit session state machine — the UI renders from `phase` only. */
/* ------------------------------------------------------------------ */

type Phase =
  | { name: "checking" }
  | { name: "invalid" }
  | { name: "expired" }
  | { name: "full"; count: number; capacity: number }
  | { name: "locked" }
  | { name: "ended"; reason: "started" | "ended" }
  | { name: "ready" }
  | { name: "requesting" }
  | { name: "waiting" }
  | { name: "rejected" }
  | { name: "approved" }
  | { name: "error"; message: string };

type DuplicateWarning = { base: string; suggestion: string; attempt: number };

const MAX_NAME_LENGTH = 80;
const POLL_INTERVAL_MS = 3000;

function shortParticipantId(id: string) {
  return `P-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

function friendlyError(error: unknown): string {
  if (error instanceof TypeError) return "Check your connection and try again.";
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

/* ------------------------------------------------------------------ */

export default function JoinSession() {
  const { token: pathToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = pathToken ?? searchParams.get("token") ?? "";

  const [phase, setPhase] = useState<Phase>({ name: "checking" });
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [formError, setFormError] = useState("");
  const [duplicate, setDuplicate] = useState<DuplicateWarning | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [approvedName, setApprovedName] = useState("");
  const [participantId, setParticipantId] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  /* ------------------------- invitation check ------------------------ */
  const checkInvitation = useCallback(async () => {
    if (!token) {
      setPhase({ name: "invalid" });
      return;
    }
    setPhase({ name: "checking" });
    try {
      const data = await getInvitationPreview(token);
      setPreview(data);
      if (!data.invitation.active) {
        setPhase({ name: "expired" });
        return;
      }
      switch (data.session_status) {
        case "open":
          setPhase({ name: "ready" });
          break;
        case "full":
          setPhase({ name: "full", count: data.participant_count, capacity: data.capacity });
          break;
        case "locked":
          setPhase({ name: "locked" });
          break;
        case "started":
          setPhase({ name: "ended", reason: "started" });
          break;
        default:
          setPhase({ name: "ended", reason: "ended" });
      }
    } catch (error) {
      const code = (error as ApiError).code;
      if (code === "invalid_invitation") {
        setPhase({ name: "invalid" });
      } else {
        setPhase({ name: "error", message: `Unable to connect to this Roundtable. ${friendlyError(error)}` });
      }
    }
  }, [token]);

  useEffect(() => {
    void checkInvitation();
  }, [checkInvitation]);

  /* --------------------------- submit request ------------------------ */
  async function submitRequest(name: string, attempt: number) {
    const clean = name.trim();
    if (!clean) {
      setFormError("Enter your display name to continue.");
      nameInputRef.current?.focus();
      return;
    }
    setFormError("");
    setPhase({ name: "requesting" });
    try {
      const created = await requestToJoin(token, clean);
      setDuplicate(null);
      setApprovedName(created.display_name);
      setRequestId(created.id);
      setPhase({ name: "waiting" });
    } catch (error) {
      const code = (error as ApiError).code;
      if (code === "duplicate_request") {
        setDuplicate({ base: clean, suggestion: `${clean} ${attempt + 1}`, attempt });
        setPhase({ name: "ready" });
        return;
      }
      // Session state may have changed since the preview — re-sync honestly.
      if (code === "invitation_expired" || code === "invitation_invalidated") {
        setPhase({ name: "expired" });
      } else if (code === "session_full") {
        await checkInvitation();
      } else if (code === "session_locked") {
        setPhase({ name: "locked" });
      } else if (code === "session_ended" || code === "session_already_started") {
        setPhase({ name: "ended", reason: code === "session_ended" ? "ended" : "started" });
      } else if (code === "invalid_invitation") {
        setPhase({ name: "invalid" });
      } else {
        setPhase({ name: "error", message: `Unable to connect to this Roundtable. ${friendlyError(error)}` });
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase.name !== "ready" || !preview) return;
    void submitRequest(displayName, duplicate?.attempt ?? 1);
  }

  function continueWithSuggestion() {
    if (!duplicate || phase.name !== "ready") return;
    setDisplayName(duplicate.suggestion);
    void submitRequest(duplicate.suggestion, duplicate.attempt + 1);
  }

  function editName() {
    setDuplicate(null);
    setFormError("");
    requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    });
  }

  /* ------------------------- status polling -------------------------- */
  useEffect(() => {
    if (phase.name !== "waiting" || !requestId || !token) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await getJoinRequestStatus(token, requestId);
        if (cancelled) return;
        if (status.status === "approved") {
          setApprovedName(status.display_name);
          setParticipantId(status.participant_id);
          // Short-lived session credential. Never displayed. Tab-scoped storage
          // so it disappears with the tab; only authorizes this session.
          try {
            sessionStorage.setItem(
              "roundtable.participantSession",
              JSON.stringify({
                invitationToken: token,
                requestId: status.id,
                participantId: status.participant_id,
                participantToken: status.participant_token,
                displayName: status.display_name,
                sessionName: preview?.session_name ?? null,
              })
            );
          } catch {
            // Storage unavailable — the session still works for this page view.
          }
          setPhase({ name: "approved" });
        } else if (status.status === "rejected") {
          setPhase({ name: "rejected" });
        }
      } catch (error) {
        if (cancelled) return;
        if ((error as ApiError).code === "invalid_request" || (error as ApiError).code === "invalid_invitation") {
          setPhase({ name: "error", message: "Your request is no longer available. Ask the host if you should try again." });
        }
        // Transient network errors: stay in waiting, retry on next tick.
      }
    };
    const interval = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [phase.name, requestId, token, preview?.session_name]);

  function tryAgain() {
    setRequestId(null);
    setDuplicate(null);
    setFormError("");
    void checkInvitation();
  }

  const phaseKey = phase.name === "requesting" ? "ready" : phase.name;

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#111111]">
      <Navbar />
      <main className="mx-auto w-full max-w-[560px] px-5 pb-24 pt-[120px] md:pt-[150px]">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#E4E4E0] bg-white px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#666]">
              <span className="h-[7px] w-[7px] rounded-full bg-[#18A874]" />
              Session invitation
            </p>
            <h1 className="editorial-tight mt-5 text-[36px] font-[700] sm:text-[48px]">You&apos;re joining a Roundtable</h1>
            {preview && (
              <p className="mt-3 break-words text-[19px] font-semibold tracking-[-0.01em]">{preview.session_name}</p>
            )}
          </div>

          <div className="mt-8" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div
                key={phaseKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {phase.name === "checking" && <StatusCard tone="neutral" title="Checking your invitation…" body="One moment while we find your session." spinning />}
                {phase.name === "invalid" && (
                  <StatusCard
                    tone="neutral"
                    title="This invitation isn't valid."
                    body="Check the invitation link or ask the host to generate a new QR code."
                    action={<BackButton />}
                  />
                )}
                {phase.name === "expired" && (
                  <StatusCard
                    tone="neutral"
                    icon={<Clock3 className="h-8 w-8 text-[#8A8A86]" strokeWidth={1.6} />}
                    title="Invitation expired."
                    body="This invitation is no longer valid. Ask the host to generate a new QR code."
                    action={<BackButton />}
                  />
                )}
                {phase.name === "full" && (
                  <StatusCard
                    tone="neutral"
                    icon={<Users className="h-8 w-8 text-[#8A8A86]" strokeWidth={1.6} />}
                    title="This Roundtable is full."
                    body="The host has reached the maximum number of participants."
                    meta={`${phase.count} / ${phase.capacity} participants`}
                    hint="Ask the host if another participant can leave before you join."
                    action={<BackButton />}
                  />
                )}
                {phase.name === "locked" && (
                  <StatusCard
                    tone="neutral"
                    title="This Roundtable is no longer accepting participants."
                    body="The host has locked new participants from joining."
                    action={<BackButton />}
                  />
                )}
                {phase.name === "ended" && (
                  <StatusCard
                    tone="neutral"
                    title={phase.reason === "started" ? "This Roundtable has already started." : "This Roundtable has ended."}
                    body="Ask the host if there is another session you should join instead."
                    action={<BackButton />}
                  />
                )}
                {phase.name === "error" && (
                  <StatusCard
                    tone="error"
                    title="Unable to connect to this Roundtable."
                    body={phase.message}
                    action={
                      <button
                        onClick={tryAgain}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#111111] px-7 py-3.5 text-[15px] font-semibold text-white transition-all hover:-translate-y-[1px]"
                      >
                        <RotateCcw className="h-4 w-4" /> Retry
                      </button>
                    }
                  />
                )}

                {(phase.name === "ready" || phase.name === "requesting") && preview && (
                  <JoinForm
                    preview={preview}
                    displayName={displayName}
                    onNameChange={(value) => {
                      setDisplayName(value);
                      if (duplicate) setDuplicate(null);
                      if (formError) setFormError("");
                    }}
                    formError={formError}
                    duplicate={duplicate}
                    submitting={phase.name === "requesting"}
                    inputRef={nameInputRef}
                    onSubmit={handleSubmit}
                    onContinueSuggestion={continueWithSuggestion}
                    onEditName={editName}
                  />
                )}

                {phase.name === "waiting" && (
                  <StatusCard
                    tone="waiting"
                    title="You're almost in."
                    body="Your request has been sent to the host."
                    meta="Waiting for approval…"
                    hint="Keep this page open. We'll let you in as soon as the host approves."
                    liveText="Waiting for host approval"
                  />
                )}

                {phase.name === "rejected" && (
                  <StatusCard
                    tone="neutral"
                    title="Your request wasn't approved."
                    body="Ask the host if you should try again."
                    action={
                      <button
                        onClick={tryAgain}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#111111] px-7 py-3.5 text-[15px] font-semibold text-white transition-all hover:-translate-y-[1px]"
                      >
                        <RotateCcw className="h-4 w-4" /> Try Again
                      </button>
                    }
                  />
                )}

                {phase.name === "approved" && (
                  <div className="rounded-[24px] border border-[#E4E4E0] bg-white p-7 text-center shadow-[0_16px_48px_rgba(0,0,0,0.04)] sm:p-9" role="status">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.35 }}>
                      <CheckCircle2 className="mx-auto h-11 w-11 text-[#18A874]" strokeWidth={1.8} />
                    </motion.div>
                    <h2 className="editorial-tight mt-4 text-[34px] font-[700]">You&apos;re in.</h2>
                    <p className="mt-2 text-[16px] text-[#666]">Welcome, {approvedName}.</p>
                    {participantId && (
                      <p className="mt-4 inline-block rounded-full bg-[#F7F7F5] px-4 py-2 font-mono text-[12px] text-[#666]">
                        Participant ID · <span className="font-semibold text-[#111111]">{shortParticipantId(participantId)}</span>
                        <span className="text-[#8A8A86]"> · temporary</span>
                      </p>
                    )}
                    <p className="mt-5 flex items-center justify-center gap-2 text-[15px] font-medium">
                      <Mic className="h-4 w-4 text-[#635BFF]" /> Your microphone is the next step.
                    </p>
                    <button
                      onClick={() => navigate("/microphone-setup")}
                      className="group mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#111111] px-8 py-4 text-[15px] font-semibold text-white transition-all hover:-translate-y-[1px] hover:shadow-xl"
                    >
                      Set Up Microphone <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-[2px]" />
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8 text-center">
            <Link to="/" className="text-[13px] font-medium text-[#666] hover:text-[#111]">
              Back to Roundtable
            </Link>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BackButton() {
  return (
    <Link
      to="/"
      className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#111111] px-7 py-3.5 text-[15px] font-semibold transition-all hover:-translate-y-[1px] hover:bg-white"
    >
      Back to Roundtable
    </Link>
  );
}

function StatusCard({
  title,
  body,
  meta,
  hint,
  action,
  icon,
  tone,
  spinning,
  liveText,
}: {
  title: string;
  body: string;
  meta?: string;
  hint?: string;
  action?: ReactNode;
  icon?: ReactNode;
  tone: "neutral" | "waiting" | "error";
  spinning?: boolean;
  liveText?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border bg-white p-7 text-center shadow-[0_16px_48px_rgba(0,0,0,0.04)] sm:p-9",
        tone === "error" ? "border-red-200" : "border-[#E4E4E0]"
      )}
    >
      {spinning ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#635BFF]" />
      ) : (
        icon ?? (tone === "waiting" ? <WaitingPulse /> : null)
      )}
      <h2 className="editorial-tight mt-4 text-[30px] font-[700] sm:text-[36px]">{title}</h2>
      <p className="mx-auto mt-3 max-w-[400px] text-[15px] leading-relaxed text-[#666]">{body}</p>
      {meta && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#F7F7F5] px-4 py-2 font-mono text-[12px] text-[#666]">
          {tone === "waiting" && <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#18A874]" />}
          {meta}
        </p>
      )}
      {hint && <p className="mx-auto mt-3 max-w-[400px] text-[13px] leading-relaxed text-[#8A8A86]">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
      {liveText && <span className="sr-only" role="status">{liveText}</span>}
    </div>
  );
}

function WaitingPulse() {
  return (
    <span className="relative mx-auto grid h-12 w-12 place-items-center" aria-hidden="true">
      <span className="absolute inset-0 animate-ping rounded-full bg-[#EAE8FF]" />
      <span className="relative grid h-12 w-12 place-items-center rounded-full bg-[#EAE8FF]">
        <span className="h-[10px] w-[10px] animate-pulse rounded-full bg-[#635BFF]" />
      </span>
    </span>
  );
}

function JoinForm({
  preview,
  displayName,
  onNameChange,
  formError,
  duplicate,
  submitting,
  inputRef,
  onSubmit,
  onContinueSuggestion,
  onEditName,
}: {
  preview: InvitationPreview;
  displayName: string;
  onNameChange: (value: string) => void;
  formError: string;
  duplicate: DuplicateWarning | null;
  submitting: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onContinueSuggestion: () => void;
  onEditName: () => void;
}) {
  const valid = displayName.trim().length > 0;
  return (
    <div className="space-y-4">
      <section aria-label="Session information" className="rounded-[24px] border border-[#E4E4E0] bg-white p-6 text-left sm:p-7">
        <dl className="divide-y divide-[#EDEDE9]">
          <InfoRow label="Session" value={preview.session_name} strong />
          <InfoRow label="Host" value={preview.host_name} />
          <InfoRow label="Participants" value={`${preview.participant_count} / ${preview.capacity}`} />
          <InfoRow
            label="Status"
            value={
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#111111]">
                <span className="h-[7px] w-[7px] rounded-full bg-[#18A874]" /> Session open
              </span>
            }
          />
        </dl>
      </section>

      <form onSubmit={onSubmit} noValidate className="rounded-[24px] border border-[#E4E4E0] bg-white p-6 text-left sm:p-7">
        <label htmlFor="display-name" className="block text-[17px] font-bold tracking-[-0.01em]">
          What&apos;s your name?
        </label>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[#666]">
          This name will appear next to your speech in the live transcript.
        </p>
        <input
          ref={inputRef}
          id="display-name"
          name="displayName"
          autoComplete="name"
          autoFocus
          maxLength={MAX_NAME_LENGTH}
          value={displayName}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Enter your display name"
          aria-describedby={duplicate ? "name-warning" : undefined}
          aria-invalid={Boolean(formError)}
          className="mt-4 h-[52px] w-full rounded-xl border border-[#E4E4E0] bg-[#F7F7F5] px-4 text-[16px] outline-none transition focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15"
        />
        {formError && (
          <p role="alert" className="mt-2.5 text-[13px] font-medium text-red-600">
            {formError}
          </p>
        )}

        {duplicate && (
          <div id="name-warning" className="mt-4 rounded-2xl border border-[#E8D9A8] bg-[#FDF6E3] p-4" role="status">
            <p className="flex items-start gap-2 text-[14px] font-semibold">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#9A7B1F]" />
              Someone is already using this name.
            </p>
            <p className="mt-1.5 pl-6 text-[13px] leading-relaxed text-[#666]">
              You can continue, but using a different name will make the transcript easier to follow.
            </p>
            <div className="mt-3 flex flex-col gap-2 pl-6 sm:flex-row">
              <button
                type="button"
                onClick={onContinueSuggestion}
                disabled={submitting}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#111111] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:-translate-y-[1px] disabled:opacity-50"
              >
                Continue as {duplicate.suggestion}
              </button>
              <button
                type="button"
                onClick={onEditName}
                disabled={submitting}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#D8CBA4] px-5 py-2.5 text-[13px] font-semibold transition hover:bg-white disabled:opacity-50"
              >
                Edit name
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!valid || submitting}
          className="group mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#111111] px-8 py-4 text-[15px] font-semibold text-white transition-all hover:-translate-y-[1px] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Requesting access…
            </>
          ) : (
            <>
              Request to Join <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-[2px]" />
            </>
          )}
        </button>
        <p className="mt-3 text-center text-[12px] text-[#8A8A86]">No account required. The host approves every request.</p>
      </form>
    </div>
  );
}

function InfoRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8A8A86]">{label}</dt>
      <dd className={cn("break-words text-right text-[15px] text-[#666]", strong && "font-semibold text-[#111111]")}>{value}</dd>
    </div>
  );
}
