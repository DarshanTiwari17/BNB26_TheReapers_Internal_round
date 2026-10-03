import { useRef, useState } from "react";
import { QrCode, Mic, MessagesSquare, Sparkles, Check } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useSpring,
  useMotionValueEvent,
} from "framer-motion";
import { Reveal } from "./Reveal";
import { useParallaxIntensity } from "../lib/useParallax";
import { cn } from "../lib/utils";

const steps = [
  { n: "01", icon: QrCode, title: "JOIN", body: "Scan a QR code and enter your name." },
  { n: "02", icon: Mic, title: "CONNECT", body: "Allow microphone access." },
  { n: "03", icon: MessagesSquare, title: "TALK", body: "Put your phone on the table and start talking." },
  { n: "04", icon: Sparkles, title: "UNDERSTAND", body: "Roundtable combines the microphone streams and creates live speaker-attributed captions." },
];

/** Static fallback for reduced-motion: same content, no pinning. */
function StaticHowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-[#E4E4E0] bg-[#F7F7F5] py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-5 md:px-8">
        <Reveal>
          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#8A8A86]">How it works</p>
          <h2 className="editorial-tight mt-4 text-[36px] font-[700] sm:text-[48px] lg:text-[60px]">Everyone brings a microphone.</h2>
        </Reveal>
        <div className="relative mt-14">
          <div className="absolute left-0 right-0 top-[26px] hidden h-px bg-[#E4E4E0] lg:block" />
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="relative">
                  <div className="relative z-10 grid h-[52px] w-[52px] place-items-center rounded-full border border-[#E4E4E0] bg-white">
                    <s.icon className="h-5 w-5" strokeWidth={1.8} />
                    <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-[#111] font-mono text-[10px] text-white">
                      {i + 1}
                    </span>
                  </div>
                  <div className="mt-6 font-mono text-[12px] text-[#8A8A86]">{s.n}</div>
                  <h3 className="mt-1 text-[18px] font-bold tracking-[-0.01em]">{s.title}</h3>
                  <p className="mt-2 max-w-[280px] text-[15px] leading-[1.6] text-[#666]">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HowItWorks() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const intensity = useParallaxIntensity();
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  // Smooth progress for the line only — state updates only on step change.
  const lineScale = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.4,
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.min(3, Math.max(0, Math.floor(v * 4)));
    setActive((prev) => (prev === idx ? prev : idx));
  });

  // Reduced motion: render the static version (no pinning, same content).
  if (intensity === 0) {
    return <StaticHowItWorks />;
  }

  const step = steps[active];

  return (
    <div
      ref={wrapperRef}
      id="how-it-works"
      className="relative scroll-mt-20 border-t border-[#E4E4E0] bg-[#F7F7F5]"
      style={{ height: "320vh" }}
    >
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden">
        <div className="mx-auto w-full max-w-[1400px] px-5 py-24 md:px-8">
          {/* Stationary header */}
          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#8A8A86]">How it works</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <h2 className="editorial-tight text-[36px] font-[700] sm:text-[48px] lg:text-[60px]">
              Everyone brings a microphone.
            </h2>
            <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#8A8A86]">
              Step {active + 1} / 04
            </p>
          </div>

          {/* Fixed timeline */}
          <div className="relative mt-12 md:mt-14">
            <div className="absolute left-[26px] right-[26px] top-[26px] h-px bg-[#E4E4E0]" />
            <motion.div
              style={{ scaleX: lineScale }}
              className="absolute left-[26px] right-[26px] top-[26px] h-px origin-left bg-[#111111]"
            />
            <div className="grid grid-cols-4 gap-2 sm:gap-6">
              {steps.map((s, i) => {
                const completed = i < active;
                const isActive = i === active;
                return (
                  <div key={s.n} className="relative">
                    <div
                      className={cn(
                        "relative z-10 grid h-[44px] w-[44px] place-items-center rounded-full border transition-colors duration-300 md:h-[52px] md:w-[52px]",
                        completed || isActive
                          ? "border-[#111111] bg-[#111111] text-white"
                          : "border-[#E4E4E0] bg-white text-[#8A8A86]",
                        isActive && "ring-2 ring-[#635BFF] ring-offset-2 ring-offset-[#F7F7F5]"
                      )}
                    >
                      <s.icon className="h-4 w-4 md:h-5 md:w-5" strokeWidth={1.8} />
                      <span
                        className={cn(
                          "absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full font-mono text-[10px] transition-colors duration-300",
                          completed
                            ? "bg-[#635BFF] text-white"
                            : isActive
                              ? "bg-[#111111] text-white"
                              : "bg-white text-[#8A8A86] ring-1 ring-[#E4E4E0]"
                        )}
                      >
                        {completed ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "mt-4 hidden font-mono text-[12px] transition-colors duration-300 sm:block",
                        isActive ? "text-[#111111]" : "text-[#8A8A86]"
                      )}
                    >
                      {s.n}
                    </div>
                    <h3
                      className={cn(
                        "mt-1 text-[13px] font-bold tracking-[-0.01em] transition-colors duration-300 md:text-[18px]",
                        completed || isActive ? "text-[#111111]" : "text-[#B9B9B4]"
                      )}
                    >
                      {s.title}
                    </h3>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active step content — only emphasis changes, layout stays fixed */}
          <div className="mt-10 min-h-[120px] md:mt-12 md:min-h-[140px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#635BFF]">
                  {step.n} — {step.title}
                </p>
                <p className="mt-2 max-w-[640px] text-[18px] font-medium leading-[1.5] tracking-[-0.01em] text-[#111111] md:text-[24px]">
                  {step.body}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress dots */}
          <div className="mt-8 flex items-center gap-2">
            {steps.map((s, i) => (
              <span
                key={s.n}
                className={cn(
                  "h-[6px] rounded-full transition-all duration-300",
                  i === active ? "w-8 bg-[#111111]" : i < active ? "w-[6px] bg-[#111111]" : "w-[6px] bg-[#D6D6D1]"
                )}
              />
            ))}
            <span className="ml-3 hidden font-mono text-[11px] uppercase tracking-[0.14em] text-[#8A8A86] sm:inline">
              Keep scrolling
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
