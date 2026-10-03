import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";
import { cn } from "../lib/utils";

type Participant = {
  name: string;
  angle: number;
  signal: number;
  caption: string;
};

const PARTICIPANTS: Participant[] = [
  { name: "Alex", angle: -90, signal: 64, caption: "Alex: I think we should review the budget first." },
  { name: "Maya", angle: 0, signal: 87, caption: "Maya: Let's move the meeting to Friday." },
  { name: "Sam", angle: 90, signal: 54, caption: "Sam: Agreed. I'll update the numbers." },
  { name: "Jordan", angle: 180, signal: 48, caption: "Jordan: Can we confirm the timeline?" },
];

function Waveform({ active, accent = false }: { active: boolean; accent?: boolean }) {
  const bars = [6, 11, 16, 10, 18, 8, 13, 7, 15, 9, 12, 6];
  return (
    <div className="flex h-[18px] items-center gap-[2.5px]">
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className={cn("w-[2px] rounded-full", accent ? "bg-[#635BFF]" : active ? "bg-[#111111]" : "bg-[#D6D6D1]")}
          animate={{ height: active ? [4, h, 5, h * 0.8, 4] : 4 }}
          transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
          style={{ height: 4 }}
        />
      ))}
    </div>
  );
}

function PhoneNode({
  p,
  active,
  x,
  y,
}: {
  p: Participant;
  active: boolean;
  x: number;
  y: number;
}) {
  return (
    <motion.div
      className="absolute z-10"
      style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
      animate={{ scale: active ? 1.06 : 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <div
        className={cn(
          "w-[132px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.08)] transition-colors sm:w-[148px]",
          active ? "border-[#635BFF]" : "border-[#E4E4E0]"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={cn("grid h-6 w-6 place-items-center rounded-full", active ? "bg-[#635BFF] text-white" : "bg-[#F1F1ED] text-[#666]")}>
              <Mic className="h-3 w-3" />
            </span>
            <span className="text-[12px] font-semibold tracking-tight">{p.name}</span>
          </div>
          <span className="flex items-center gap-1">
            <span className={cn("h-[6px] w-[6px] rounded-full", active ? "bg-[#18A874]" : "bg-[#C9C9C4]")} />
            <span className="font-mono text-[10px] text-[#8A8A86]">{p.signal}%</span>
          </span>
        </div>
        <div className="mt-2 rounded-lg bg-[#F7F7F5] px-2 py-1.5">
          <Waveform active={active} accent={active} />
        </div>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1.5 rounded-lg bg-[#EAE8FF] px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[#635BFF]"
          >
            Clearest signal
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default function HeroAudioVisualization() {
  const [activeIdx, setActiveIdx] = useState(1);
  const R = 150;

  useEffect(() => {
    const id = setInterval(() => setActiveIdx((i) => (i + 1) % PARTICIPANTS.length), 2600);
    return () => clearInterval(id);
  }, []);

  const active = PARTICIPANTS[activeIdx];

  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="relative aspect-square w-full">
        {/* table */}
        <div className="absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#E4E4E0] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.06)] sm:h-[260px] sm:w-[260px]">
          <div className="absolute inset-4 rounded-full border border-dashed border-[#E4E4E0]" />
          <div className="absolute inset-10 rounded-full bg-[#F7F7F5]" />
        </div>

        {/* travelling waves: SVG rings from each phone to center */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 560 560" fill="none">
          {PARTICIPANTS.map((p, i) => {
            const rad = ((p.angle - 90) * Math.PI) / 180;
            const x2 = 280 + R * 1.55 * Math.cos(rad);
            const y2 = 280 + R * 1.55 * Math.sin(rad);
            const isActive = i === activeIdx;
            return (
              <g key={p.name}>
                <line x1={280} y1={280} x2={x2} y2={y2} stroke={isActive ? "#635BFF" : "#E4E4E0"} strokeWidth={isActive ? 1.5 : 1} strokeDasharray="3 6" opacity={isActive ? 0.9 : 0.7} />
                {isActive && (
                  <>
                    <motion.circle cx={280} cy={280} r={10} stroke="#635BFF" strokeWidth={1.5} initial={{ r: 8, opacity: 0.8 }} animate={{ r: [8, 70], opacity: [0.7, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }} fill="none" />
                    <motion.circle cx={x2} cy={y2} r={6} fill="#635BFF" animate={{ opacity: [1, 0.4, 1], scale: [1, 0.85, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* phones */}
        {PARTICIPANTS.map((p, i) => {
          const rad = ((p.angle - 90) * Math.PI) / 180;
          const x = Math.cos(rad) * R * 1.55;
          const y = Math.sin(rad) * R * 1.55;
          // clamp for mobile
          const scale = typeof window !== "undefined" && window.innerWidth < 480 ? 0.72 : 1;
          return <PhoneNode key={p.name} p={p} active={i === activeIdx} x={x * scale} y={y * scale} />;
        })}

        {/* center */}
        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2.6, repeat: Infinity }}
            className="grid h-[132px] w-[132px] place-items-center rounded-full bg-[#111111] text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:h-[148px] sm:w-[148px]"
          >
            <div>
              <div className="flex items-center justify-center gap-1.5">
                <span className="h-[6px] w-[6px] animate-pulse rounded-full bg-[#18A874]" />
                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/70">Live</span>
              </div>
              <div className="mt-1 text-[13px] font-bold uppercase leading-[1.1] tracking-[0.08em] text-white">
                Roundtable
                <br />
                AI
              </div>
              <div className="mx-auto mt-2 flex items-end justify-center gap-[2px]">
                {[8, 14, 6, 12, 9, 16, 7].map((h, i) => (
                  <motion.span
                    key={i}
                    className="w-[2px] rounded-full bg-[#635BFF]"
                    animate={{ height: [4, h, 4] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.12 }}
                    style={{ height: 4 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* caption */}
      <div className="mx-auto mt-2 min-h-[74px] w-full max-w-[420px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-[#E4E4E0] bg-white px-5 py-3.5 text-center shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#635BFF]">
              {active.name} · {active.signal}% · Clearest signal
            </div>
            <div className="mt-1 text-[15px] font-medium tracking-[-0.01em] text-[#111]">
              “{active.caption.split(": ").slice(1).join(": ")}”
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
