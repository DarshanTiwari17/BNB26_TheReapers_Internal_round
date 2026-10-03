import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

type HostSession = {
  sessionId: string;
  hostToken: string;
  sessionName: string;
  maximumParticipants: number;
};

export default function SessionCreation() {
  const navigate = useNavigate();
  const [sessionName, setSessionName] = useState("");
  const [maximumParticipants, setMaximumParticipants] = useState("8");
  const [errors, setErrors] = useState<{ sessionName?: string; participants?: string }>({});
  const [creating, setCreating] = useState(false);
  const [creationError, setCreationError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = sessionName.trim();
    const participants = Number(maximumParticipants);
    const nextErrors: typeof errors = {};

    if (!name) nextErrors.sessionName = "Enter a name for your session.";
    if (!Number.isInteger(participants) || participants < 2 || participants > 100) {
      nextErrors.participants = "Choose a whole number between 2 and 100.";
    }
    setErrors(nextErrors);
    setCreationError("");
    if (Object.keys(nextErrors).length > 0) return;

    setCreating(true);
    try {
      const hostTokenBytes = window.crypto.getRandomValues(new Uint8Array(32));
      const session: HostSession = {
        sessionId: window.crypto.randomUUID(),
        hostToken: Array.from(hostTokenBytes, (byte) => byte.toString(16).padStart(2, "0")).join(""),
        sessionName: name,
        maximumParticipants: participants,
      };
      navigate("/host-lobby", { state: { session }, replace: true });
    } catch {
      setCreating(false);
      setCreationError("A secure session could not be created in this browser. Try again in a secure context.");
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#111111]">
      <Navbar />
      <main className="mx-auto max-w-[1040px] px-5 pb-24 pt-[132px] md:px-8 md:pt-[156px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-16"
        >
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#E4E4E0] bg-white px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#666]">
              <span className="h-[7px] w-[7px] rounded-full bg-[#18A874]" />
              Host a roundtable
            </p>
            <h1 className="editorial-tight mt-6 text-[44px] font-[700] sm:text-[58px]">Create your session.</h1>
            <p className="mt-5 max-w-[390px] text-[16px] leading-[1.65] text-[#666]">
              Set up a table and invite people to join with its session ID. No account needed.
            </p>
            <div className="mt-8 flex items-start gap-3 text-[13px] leading-relaxed text-[#8A8A86]">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#635BFF]" />
              <span>Your host token is generated privately and shown only in your host lobby.</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-[#E4E4E0] bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.04)] sm:p-8">
            <div>
              <label htmlFor="session-name" className="block text-[14px] font-semibold">Session Name</label>
              <input
                id="session-name"
                name="sessionName"
                autoComplete="off"
                maxLength={80}
                value={sessionName}
                onChange={(event) => setSessionName(event.target.value)}
                aria-invalid={Boolean(errors.sessionName)}
                aria-describedby={errors.sessionName ? "session-name-error" : undefined}
                placeholder="e.g. Product team sync"
                className="mt-2.5 h-12 w-full rounded-xl border border-[#E4E4E0] bg-[#F7F7F5] px-4 text-[15px] outline-none transition focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 aria-[invalid=true]:border-red-500"
              />
              {errors.sessionName && <p id="session-name-error" className="mt-2 text-[13px] text-red-600">{errors.sessionName}</p>}
            </div>

            <div className="mt-6">
              <label htmlFor="maximum-participants" className="block text-[14px] font-semibold">Maximum Participants</label>
              <input
                id="maximum-participants"
                name="maximumParticipants"
                type="number"
                min={2}
                max={100}
                step={1}
                inputMode="numeric"
                value={maximumParticipants}
                onChange={(event) => setMaximumParticipants(event.target.value)}
                aria-invalid={Boolean(errors.participants)}
                aria-describedby={errors.participants ? "participants-error" : "participants-help"}
                className="mt-2.5 h-12 w-full rounded-xl border border-[#E4E4E0] bg-[#F7F7F5] px-4 text-[15px] outline-none transition focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15 aria-[invalid=true]:border-red-500"
              />
              <p id={errors.participants ? "participants-error" : "participants-help"} className={`mt-2 text-[13px] ${errors.participants ? "text-red-600" : "text-[#8A8A86]"}`}>
                {errors.participants ?? "Choose a limit between 2 and 100 people."}
              </p>
            </div>

            {creationError && <p role="alert" className="mt-5 text-[13px] text-red-600">{creationError}</p>}

            <button
              type="submit"
              disabled={creating}
              className="group mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#111111] px-6 py-3.5 text-[15px] font-semibold text-white transition-all hover:-translate-y-[2px] hover:shadow-xl disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70"
            >
              {creating ? "Creating session..." : "Create Session"}
              {!creating && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-[2px]" />}
            </button>
            <p className="mt-4 text-center text-[12px] text-[#8A8A86]">No account required.</p>
          </form>
        </motion.div>
        <div className="mt-10 border-t border-[#E4E4E0] pt-5">
          <Link to="/" className="text-[13px] font-medium text-[#666] transition-colors hover:text-[#111]">Back to Roundtable</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}