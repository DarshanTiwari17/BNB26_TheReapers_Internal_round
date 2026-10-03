import { useEffect, useRef } from "react";

/**
 * Live level meter driven by requestAnimationFrame.
 * Writes transforms directly to the DOM — no React state churn.
 */
export default function AudioLevelMeter({
  getLevel,
  live,
  label = "Microphone level",
}: {
  getLevel: (() => number) | null;
  live: boolean;
  label?: string;
}) {
  const fillRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const smoothRef = useRef(0);

  useEffect(() => {
    const tick = () => {
      const target = live && getLevel ? getLevel() : 0;
      // Gentle smoothing so the meter feels physical, not jittery.
      smoothRef.current += (target - smoothRef.current) * 0.35;
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0.02, smoothRef.current)).toFixed(3)})`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [getLevel, live]);

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8A8A86]">{label}</p>
      <div
        className="mt-2 h-4 overflow-hidden rounded-full bg-[#EDEDE9]"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          ref={fillRef}
          className="h-full w-full origin-left rounded-full bg-[#635BFF]"
          style={{ transform: "scaleX(0.02)" }}
        />
      </div>
    </div>
  );
}
