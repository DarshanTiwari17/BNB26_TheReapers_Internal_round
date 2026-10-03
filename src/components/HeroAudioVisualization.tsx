import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useTransform,
  useSpring,
  useMotionValue,
  type MotionValue,
} from "framer-motion";
import { Mic } from "lucide-react";
import { cn } from "../lib/utils";
import { useParallaxIntensity, useIsCoarsePointer } from "../lib/useParallax";

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

/** Per-phone scroll offsets (desktop px). Order matches PARTICIPANTS. */
const PHONE_SCROLL_OFFSETS = [-18, -12, 12, 18];

function Waveform({ active, accent = false }: { active: boolean; accent?: boolean }) {
  const bars = [6, 11, 16, 10, 18, 8, 13, 7, 15, 9, 12, 6];
  return (
    <div className="flex h-[18px] items-center gap-[2.5px]">
      {bars.map((h, i) =>
        active ? (
          <motion.span
            key={i}
            className={cn("w-[2px] origin-center rounded-full", accent ? "bg-[#635BFF]" : "bg-[#111111]")}
            animate={{ scaleY: [0.3, 1, 0.35, 0.8, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
            style={{ height: h }}
          />
        ) : (
          <span key={i} className="w-[2px] rounded-full bg-[#D6D6D1]" style={{ height: 4 }} />
        )
      )}
    </div>
  );
}

function PhoneNode({
  p,
  active,
  x,
  y,
  scrollY,
  mouseX,
  mouseY,
}: {
  p: Participant;
  active: boolean;
  x: number;
  y: number;
  scrollY: MotionValue<number>;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}) {
  return (
    <motion.div
      className="absolute z-10"
      style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, y: scrollY, x: mouseX, willChange: "transform" }}
    >
      <motion.div
        animate={{ scale: active ? 1.06 : 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        style={{ y: mouseY, willChange: "transform" }}
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
    </motion.div>
  );
}

export default function HeroAudioVisualization({
  scrollProgress,
}: {
  scrollProgress: MotionValue<number>;
}) {
  const [activeIdx, setActiveIdx] = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const R = 150;

  const intensity = useParallaxIntensity();
  const coarse = useIsCoarsePointer();

  const progress = scrollProgress;

  useEffect(() => {
    const id = setInterval(() => setActiveIdx((i) => (i + 1) % PARTICIPANTS.length), 2600);
    return () => clearInterval(id);
  }, []);

  const active = PARTICIPANTS[activeIdx];

  // ---- Scroll parallax layers (GPU transforms only, settled springs) ----
  // L1 background: ~10px over hero exit
  const bgYRaw = useTransform(progress, [0, 1], [0, 10 * intensity]);
  const bgY = useSpring(bgYRaw, { stiffness: 100, damping: 30 });

  // L4 center AI: ~0.06x, anchored
  const centerYRaw = useTransform(progress, [0, 1], [0, -8 * intensity]);
  const centerY = useSpring(centerYRaw, { stiffness: 100, damping: 30 });

  // L3 waves: 0.18x + tiny horizontal drift
  const wavesYRaw = useTransform(progress, [0, 1], [0, -22 * intensity]);
  const wavesXRaw = useTransform(progress, [0, 1], [0, 8 * intensity]);
  const wavesY = useSpring(wavesYRaw, { stiffness: 100, damping: 30 });
  const wavesX = useSpring(wavesXRaw, { stiffness: 100, damping: 30 });

  // L2 phones: individual offsets (-18 / -12 / +12 / +18)
  const p0Raw = useTransform(progress, [0, 1], [0, PHONE_SCROLL_OFFSETS[0] * intensity]);
  const p1Raw = useTransform(progress, [0, 1], [0, PHONE_SCROLL_OFFSETS[1] * intensity]);
  const p2Raw = useTransform(progress, [0, 1], [0, PHONE_SCROLL_OFFSETS[2] * intensity]);
  const p3Raw = useTransform(progress, [0, 1], [0, PHONE_SCROLL_OFFSETS[3] * intensity]);
  const p0Y = useSpring(p0Raw, { stiffness: 100, damping: 30 });
  const p1Y = useSpring(p1Raw, { stiffness: 100, damping: 30 });
  const p2Y = useSpring(p2Raw, { stiffness: 100, damping: 30 });
  const p3Y = useSpring(p3Raw, { stiffness: 100, damping: 30 });
  const phoneScrollY = [p0Y, p1Y, p2Y, p3Y];

  // ---- Mouse parallax (visual only, disabled on touch / reduced motion) ----
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sMx = useSpring(mx, { stiffness: 120, damping: 25 });
  const sMy = useSpring(my, { stiffness: 120, damping: 25 });

  const mouseEnabled = !coarse && intensity > 0;

  const phoneMouseX = useTransform(sMx, [-0.5, 0.5], [-7, 7]);
  const phoneMouseY = useTransform(sMy, [-0.5, 0.5], [-7, 7]);
  const wavesMouseX = useTransform(sMx, [-0.5, 0.5], [-4, 4]);
  const wavesMouseY = useTransform(sMy, [-0.5, 0.5], [-4, 4]);
  const centerMouseX = useTransform(sMx, [-0.5, 0.5], [-2.5, 2.5]);
  const centerMouseY = useTransform(sMy, [-0.5, 0.5], [-2.5, 2.5]);

  const zero = useMotionValue(0);

  const onMouseMove = (e: React.MouseEvent) => {
    if (!mouseEnabled || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onMouseLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div
        ref={wrapRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="relative aspect-square w-full"
      >
        {/* LAYER 1 — background / table (slowest) */}
        <motion.div style={{ y: bgY, willChange: "transform" }} className="absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#E4E4E0] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.06)] sm:h-[260px] sm:w-[260px]">
            <div className="absolute inset-4 rounded-full border border-dashed border-[#E4E4E0]" />
            <div className="absolute inset-10 rounded-full bg-[#F7F7F5]" />
          </div>
        </motion.div>

        {/* LAYER 3 — audio waves (float between phones) */}
        <motion.svg
          style={{ y: wavesY, x: wavesX, willChange: "transform" }}
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 560 560"
          fill="none"
        >
          <motion.g style={{ x: mouseEnabled ? wavesMouseX : zero, y: mouseEnabled ? wavesMouseY : zero }}>
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
          </motion.g>
        </motion.svg>

        {/* LAYER 2 — smartphones */}
        {PARTICIPANTS.map((p, i) => {
          const rad = ((p.angle - 90) * Math.PI) / 180;
          const x = Math.cos(rad) * R * 1.55;
          const y = Math.sin(rad) * R * 1.55;
          const scale = typeof window !== "undefined" && window.innerWidth < 480 ? 0.72 : 1;
          return (
            <PhoneNode
              key={p.name}
              p={p}
              active={i === activeIdx}
              x={x * scale}
              y={y * scale}
              scrollY={phoneScrollY[i]}
              mouseX={mouseEnabled ? phoneMouseX : zero}
              mouseY={mouseEnabled ? phoneMouseY : zero}
            />
          );
        })}

        {/* LAYER 4 — center AI (anchored) */}
        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <motion.div style={{ y: centerY, x: mouseEnabled ? centerMouseX : zero, willChange: "transform" }}>
            <motion.div
              style={{ y: mouseEnabled ? centerMouseY : zero, willChange: "transform" }}
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
                <div className="mx-auto mt-2 flex h-[16px] items-center justify-center gap-[2px]">
                  {[8, 14, 6, 12, 9, 16, 7].map((h, j) => (
                    <motion.span
                      key={j}
                      className="w-[2px] origin-center rounded-full bg-[#635BFF]"
                      animate={{ scaleY: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: j * 0.12 }}
                      style={{ height: h }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* caption — no parallax, stays readable */}
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
