import { CheckCircle2, Loader2, Play, RotateCcw } from "lucide-react";
import AudioLevelMeter from "./AudioLevelMeter";

export type MicTestState = "idle" | "testing" | "passed" | "quiet";

export default function MicrophoneTest({
  state,
  getLevel,
  onStart,
  onRetry,
}: {
  state: MicTestState;
  getLevel: (() => number) | null;
  onStart: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#E4E4E0] p-5">
      <h3 className="text-[16px] font-bold tracking-[-0.01em]">Test your microphone</h3>
      <p className="mt-1 text-[14px] text-[#666]">
        {state === "testing" ? "Say something for a moment." : "Say something for a moment to check it hears you."}
      </p>

      <div className="mt-4">
        <AudioLevelMeter getLevel={getLevel} live={state === "testing" || state === "passed"} />
      </div>

      {state === "idle" && (
        <button
          type="button"
          onClick={onStart}
          className="mt-4 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#111111] px-6 py-3 text-[14px] font-semibold transition-all hover:-translate-y-[1px] hover:bg-white"
        >
          <Play className="h-4 w-4" /> Start Test
        </button>
      )}

      {state === "testing" && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#EAE8FF] px-4 py-2 text-[13px] font-semibold text-[#635BFF]" role="status">
          <Loader2 className="h-4 w-4 animate-spin" /> Listening…
        </p>
      )}

      {state === "passed" && (
        <div className="mt-4 rounded-2xl bg-[#18A874]/10 p-4" role="status">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-[#111111]">
            <CheckCircle2 className="h-5 w-5 text-[#18A874]" /> Microphone ready
          </p>
          <p className="mt-1 text-[13px] text-[#666]">Your microphone is picking up sound clearly.</p>
        </div>
      )}

      {state === "quiet" && (
        <div className="mt-4 rounded-2xl border border-[#E8D9A8] bg-[#FDF6E3] p-4" role="alert">
          <p className="text-[14px] font-semibold">Your microphone is very quiet.</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#666]">
            Try speaking closer to your phone or choose another microphone.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:-translate-y-[1px]"
          >
            <RotateCcw className="h-4 w-4" /> Test Again
          </button>
        </div>
      )}

      <p className="mt-4 text-[12px] leading-relaxed text-[#8A8A86]">
        Your microphone test is used only to check that your device is working.
      </p>
    </div>
  );
}
