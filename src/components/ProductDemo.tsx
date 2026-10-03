import { motion } from "framer-motion";
import { Reveal } from "./Reveal";

const people = ["Alex", "Maya", "Sam", "Jordan"];

const transcript = [
  { who: "Maya", time: "00:12", text: "We should move the meeting to Friday.", active: true },
  { who: "Alex", time: "00:18", text: "I think we should review the budget first.", active: false },
  { who: "Sam", time: "00:24", text: "Agreed. I'll update the numbers.", active: false },
];

export default function ProductDemo() {
  return (
    <section className="bg-[#111111] py-24 text-white md:py-32">
      <div className="mx-auto max-w-[1400px] px-5 md:px-8">
        <Reveal>
          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-white/50">Live preview · Visual demo only</p>
          <h2 className="editorial-tight mt-4 max-w-[900px] text-[36px] font-[700] sm:text-[48px] lg:text-[64px]">
            WATCH A CONVERSATION BECOME A TRANSCRIPT.
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-12 overflow-hidden rounded-[28px] border border-white/10 bg-[#1A1A1A]">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="h-[8px] w-[8px] animate-pulse rounded-full bg-[#18A874]" />
                <span className="text-[12px] font-bold uppercase tracking-[0.16em]">Live</span>
                <span className="ml-2 hidden font-mono text-[12px] text-white/40 sm:inline">roundtable/session-4F8K · 00:24</span>
              </div>
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#635BFF]" />
              </div>
            </div>

            <div className="grid lg:grid-cols-[300px_1fr]">
              <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">Participants · 4</div>
                <div className="mt-4 space-y-3">
                  {people.map((p, i) => (
                    <div key={p} className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-[13px] font-bold">
                          {p[0]}
                        </span>
                        <div>
                          <div className="text-[14px] font-semibold">{p}</div>
                          <div className="flex items-center gap-1 text-[12px] text-[#18A874]">
                            <span className="h-[6px] w-[6px] rounded-full bg-[#18A874]" /> Connected
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-[2px]">
                        {[6, 12, 8, 14, 5, 10, 7].map((h, j) => (
                          <motion.span
                            key={j}
                            className="w-[2px] rounded-full bg-[#635BFF]"
                            animate={{ height: [3, i === 1 ? h : 4, 3] }}
                            transition={{ duration: 1.4, repeat: Infinity, delay: j * 0.1 + i * 0.2 }}
                            style={{ height: 3 }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 md:p-8">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">Live transcript</div>
                <div className="mt-4 space-y-3">
                  {transcript.map((t) => (
                    <div
                      key={t.time}
                      className={
                        t.active
                          ? "rounded-2xl border border-[#635BFF]/40 bg-[#635BFF]/10 p-5"
                          : "rounded-2xl bg-white/[0.04] p-5"
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span className={"text-[13px] font-bold " + (t.active ? "text-[#A9A3FF]" : "text-white/80")}>{t.who}</span>
                        <span className="font-mono text-[12px] text-white/40">{t.time}</span>
                      </div>
                      <p className="mt-1.5 text-[17px] leading-snug tracking-[-0.01em]">“{t.text}”</p>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-1 pt-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#635BFF]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#635BFF] [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-[#635BFF] [animation-delay:300ms]" />
                    <span className="ml-1 text-[13px] text-white/50">Listening…</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-white/10 px-6 py-4 font-mono text-[12px] text-white/50">
              <span><span className="text-white">4</span> microphones</span>
              <span><span className="text-white">3</span> speakers</span>
              <span>Live transcription</span>
              <span className="ml-auto hidden sm:inline">Auto-deletes in 60:00</span>
            </div>
          </div>
        </Reveal>
        <p className="mt-6 text-center text-[13px] text-white/40">This is a visual demo only. No microphone connected.</p>
      </div>
    </section>
  );
}
