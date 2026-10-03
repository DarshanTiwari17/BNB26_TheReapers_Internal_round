import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { requestToJoin, type ApiError } from "../lib/api";

function messageFor(error: unknown) {
  const apiError = error as ApiError;
  if (apiError.code === "invitation_expired") return "This invitation has expired. Ask the host to generate a new QR code.";
  if (apiError.code === "invitation_invalidated") return "This invitation is no longer active. Ask the host for a new QR code.";
  if (apiError.code === "session_full") return "This session is full. The host cannot accept more participants.";
  if (apiError.code === "session_locked") return "This session is locked. New participants can no longer join.";
  if (apiError.code === "duplicate_request") return "A join request with this name is already waiting or approved.";
  return error instanceof Error ? error.message : "The join request could not be sent.";
}

export default function JoinSession() {
  const { token } = useParams<{ token: string }>();
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = displayName.trim();
    if (!token || !name) return;
    setSubmitting(true);
    setError("");
    try {
      await requestToJoin(token, name);
      setSubmittedName(name);
    } catch (requestError) {
      setError(messageFor(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#111111]">
      <Navbar />
      <main className="mx-auto flex max-w-[760px] flex-col items-center px-5 pb-24 pt-[140px] text-center md:pt-[170px]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#E4E4E0] bg-white px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#666]">
            <span className="h-[7px] w-[7px] rounded-full bg-[#18A874]" />
            Join a roundtable
          </p>
          {submittedName ? (
            <div className="mx-auto mt-8 max-w-[520px] rounded-2xl border border-[#E4E4E0] bg-white p-8 shadow-[0_16px_48px_rgba(0,0,0,0.04)] sm:p-10">
              <CheckCircle2 className="mx-auto h-12 w-12 text-[#18A874]" />
              <h1 className="editorial-tight mt-5 text-[42px] font-[700] sm:text-[56px]">Request sent.</h1>
              <p className="mt-4 text-[16px] leading-relaxed text-[#666]">Thanks, {submittedName}. The host will approve your request before you enter the session.</p>
              <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-[#8A8A86]">You can keep this page open</p>
            </div>
          ) : (
            <>
              <h1 className="editorial-tight mt-6 text-[44px] font-[700] sm:text-[64px]">Join the session.</h1>
              <p className="mx-auto mt-5 max-w-[480px] text-[16px] leading-relaxed text-[#666]">Enter your name to send a request to the host. Your microphone will not be used until you are approved.</p>
              <form onSubmit={handleSubmit} noValidate className="mx-auto mt-8 max-w-[480px] rounded-2xl border border-[#E4E4E0] bg-white p-6 text-left shadow-[0_16px_48px_rgba(0,0,0,0.04)] sm:p-8">
                <label htmlFor="display-name" className="block text-[14px] font-semibold">Your name</label>
                <input id="display-name" name="displayName" autoComplete="name" maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="e.g. Alex Morgan" className="mt-2.5 h-12 w-full rounded-xl border border-[#E4E4E0] bg-[#F7F7F5] px-4 text-[15px] outline-none transition focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/15" />
                {error && <p role="alert" className="mt-3 text-[13px] text-red-600">{error}</p>}
                <button type="submit" disabled={submitting || !displayName.trim() || !token} className="group mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#111] px-6 py-3.5 text-[15px] font-semibold text-white transition-all hover:-translate-y-[2px] hover:shadow-xl disabled:cursor-wait disabled:opacity-50">
                  {submitting ? "Sending request..." : "Request to Join"}
                  {!submitting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-[2px]" />}
                </button>
                <p className="mt-4 flex items-center justify-center gap-2 text-center text-[12px] text-[#8A8A86]"><LockKeyhole className="h-3.5 w-3.5 text-[#635BFF]" />The host controls admission.</p>
              </form>
            </>
          )}
          <Link to="/" className="mt-8 inline-block text-[13px] font-medium text-[#666] hover:text-[#111]">Back to Roundtable</Link>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
