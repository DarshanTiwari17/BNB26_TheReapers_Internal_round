import { motion } from "framer-motion";
import { Reveal } from "./Reveal";
import { cn } from "../lib/utils";

const phones = [
  { id: "PHONE A", label: "Noisy", pct: 32 },
  { id: "PHONE B", label: "Clear", pct: 87, highlight: true },
  { id: "PHONE C", label: "Moderate", pct: 54 },
];

export default function TechnologySection() {
  return (
    <section id="technology" className="scroll-mt-20 border-t border-[#E4E4E0] bg-white py-24 md:py-32">
      <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-5 md:px-8 lg:grid-cols-2">
        <div>
          <Reveal>
            <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#8A8A86]">Technology</p>
            <h2 className="editorial-tight mt-4 text-[36px] font-[700] sm:text-[48px] lg:text-[56px]">
              Multiple microphones. One intelligent layer.
            </h2>
            <p className="mt-6 max-w-[480px] text-[16px] leading-[1.7] text-[#666]">
              Roundtable evaluates speech activity, signal quality and microphone proximity to determine which audio stream should influence each moment of the conversation.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {["Speech activity", "Signal quality", "Proximity"].map((t) => (
                <span key={t} className="rounded-full border border-[#E4E4E0] bg-[#F7F7F5] px-4 py-2 text-[13px] font-medium">
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="rounded-[28px] border border-[#E4E4E0] bg-[#F7F7F5] p-6 md:p-8">
            {phones.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "mb-3 rounded-2xl border bg-white p-5",
                  p.highlight ? "border-[#635BFF] shadow-[0_16px_40px_rgba(99,91,255,0.15)]" : "border-[#E4E4E0]"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[12px] font-semibold">{p.id}</span>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-[12px] font-semibold",
                        p.highlight ? "bg-[#635BFF] text-white" : "bg-[#F1F1ED] text-[#666]"
                      )}
                    >
                      {p.label} · {p.pct}%
                    </span>
                  </div>
                  {p.highlight && (
                    <span className="rounded-full bg-[#EAE8FF] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#635BFF]">
                      Selected
                    </span>
                  )}
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#EDEDE9]">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${p.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className={cn("h-full rounded-full", p.highlight ? "bg-[#635BFF]" : "bg-[#CFCFC9]")}
                  />
                </div>
                <div className="mt-3 flex h-[22px] items-center gap-[3px]">
                  {Array.from({ length: 32 }).map((_, i) => {
                    const peak = 8 + Math.abs(Math.sin(i)) * 14;
                    return p.highlight ? (
                      <motion.span
                        key={i}
                        className="w-[3px] origin-center rounded-full bg-[#635BFF]/70"
                        animate={{ scaleY: [0.25, 1, 0.25] }}
                        transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.05 }}
                        style={{ height: peak }}
                      />
                    ) : (
                      <span key={i} className="w-[3px] rounded-full bg-[#E0E0DB]" style={{ height: 4 }} />
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="mt-2 px-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#8A8A86]">
              Evaluated every 200ms · Clearest stream leads
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
