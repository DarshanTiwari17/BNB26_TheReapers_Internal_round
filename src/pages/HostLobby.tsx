import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Check, Copy, LockKeyhole } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

type HostSession = {
  sessionId: string;
  hostToken: string;
  sessionName: string;
  maximumParticipants: number;
};

export default function HostLobby() {
  const location = useLocation();
  const session = (location.state as { session?: HostSession } | null)?.session;
  const [copied, setCopied] = useState<"sessionId" | "hostToken" | null>(null);
  const [copyError, setCopyError] = useState("");

  if (!session) return <Navigate to="/create-session" replace />;
  const hostToken = session.hostToken;
  const sessionId = session.sessionId;

  async function copyValue(value: string, target: "sessionId" | "hostToken") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(target);
      setCopyError("");
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
      setCopyError("Clipboard access is unavailable. Select and copy the value manually.");
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#111111]">
      <Navbar />
      <main className="mx-auto max-w-[900px] px-5 pb-24 pt-[132px] md:px-8 md:pt-[156px]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#E4E4E0] bg-white px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#666]">
            <span className="h-[7px] w-[7px] rounded-full bg-[#18A874]" />
            Host lobby
          </p>
          <h1 className="editorial-tight mt-6 break-words text-[40px] font-[700] sm:text-[58px]">{session.sessionName}</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#666]">Your session is ready. Share the session ID with your participants.</p>

          <section className="mt-8 rounded-2xl border border-[#E4E4E0] bg-white p-6 shadow-[0_16px_48px_rgba(0,0,0,0.04)] sm:p-8">
            <div className="grid gap-7 sm:grid-cols-2">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8A8A86]">Session ID</p>
                  <p className="mt-2 break-all font-mono text-[15px] text-[#111]">{sessionId}</p>
                </div>
                <button onClick={() => copyValue(sessionId, "sessionId")} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-[#E4E4E0] px-3 py-2 text-[12px] font-medium transition-colors hover:bg-[#F7F7F5]" aria-label="Copy session ID">
                  {copied === "sessionId" ? <Check className="h-4 w-4 text-[#18A874]" /> : <Copy className="h-4 w-4" />}
                  {copied === "sessionId" ? "Copied" : "Copy ID"}
                </button>
              </div>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8A8A86]">Maximum Participants</p>
                <p className="mt-2 text-[15px] text-[#111]">{session.maximumParticipants}</p>
              </div>
            </div>

            <div className="mt-7 border-t border-[#E4E4E0] pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-[14px] font-semibold"><LockKeyhole className="h-4 w-4 text-[#635BFF]" />Host token</p>
                  <p className="mt-1 text-[13px] text-[#8A8A86]">Keep this private. It grants host access to this session.</p>
                </div>
                <button onClick={() => copyValue(hostToken, "hostToken")} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#E4E4E0] px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[#F7F7F5]" aria-label="Copy host token">
                  {copied === "hostToken" ? <Check className="h-4 w-4 text-[#18A874]" /> : <Copy className="h-4 w-4" />}
                  {copied === "hostToken" ? "Copied" : "Copy token"}
                </button>
              </div>
              <p className="mt-4 break-all rounded-xl bg-[#F7F7F5] p-4 font-mono text-[12px] leading-relaxed text-[#666]">{session.hostToken}</p>
            </div>
            {copyError && <p role="alert" className="mt-4 text-[13px] text-red-600">{copyError}</p>}
            {copied && <p className="sr-only" aria-live="polite">{copied === "sessionId" ? "Session ID" : "Host token"} copied to clipboard.</p>}
          </section>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/" className="inline-flex items-center justify-center rounded-full bg-[#111111] px-7 py-3.5 text-[14px] font-semibold text-white transition-all hover:-translate-y-[2px] hover:shadow-xl">Back to Roundtable</Link>
            <span className="text-[13px] text-[#8A8A86]">Waiting for participants</span>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}