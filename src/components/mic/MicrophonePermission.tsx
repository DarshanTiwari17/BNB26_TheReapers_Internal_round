import { Loader2, Mic } from "lucide-react";
import type { ReactNode } from "react";

export default function MicrophonePermission({
  state,
  onAllow,
  headline,
}: {
  state: "idle" | "requesting" | "denied" | "no-device" | "unavailable";
  onAllow: () => void;
  headline?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E4E4E0] p-5 text-center sm:p-6">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#EAE8FF]">
        <Mic className="h-6 w-6 text-[#635BFF]" />
      </span>
      {headline ?? (
        <>
          <h3 className="mt-4 text-[17px] font-bold tracking-[-0.01em]">Microphone access required</h3>
          <p className="mx-auto mt-1.5 max-w-[380px] text-[14px] leading-relaxed text-[#666]">
            Roundtable needs microphone access to hear your side of the conversation.
          </p>
        </>
      )}
      {state === "denied" && (
        <p role="alert" className="mx-auto mt-3 max-w-[380px] text-[13px] leading-relaxed text-[#666]">
          Microphone access is blocked. Allow microphone access in your browser settings, then try again.
        </p>
      )}
      {state === "no-device" && (
        <p role="alert" className="mx-auto mt-3 max-w-[380px] text-[13px] leading-relaxed text-[#666]">
          No microphone detected. Connect a microphone and try again.
        </p>
      )}
      {state === "unavailable" && (
        <p role="alert" className="mx-auto mt-3 max-w-[380px] text-[13px] leading-relaxed text-[#666]">
          Your microphone isn&apos;t available right now. Check that no other app is using it, then try again.
        </p>
      )}
      <button
        type="button"
        onClick={onAllow}
        disabled={state === "requesting"}
        className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#111111] px-8 py-4 text-[15px] font-semibold text-white transition-all hover:-translate-y-[1px] hover:shadow-xl disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {state === "requesting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Requesting access…
          </>
        ) : state === "idle" ? (
          "Allow Microphone"
        ) : (
          "Try Again"
        )}
      </button>
    </div>
  );
}
