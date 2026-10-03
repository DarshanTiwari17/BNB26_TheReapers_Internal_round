import { Reveal } from "./Reveal";

const cases = [
  { tag: "01", title: "MEETINGS", body: "Keep every speaker and decision in context." },
  { tag: "02", title: "CLASSROOMS", body: "Capture discussions without a single microphone at the front." },
  { tag: "03", title: "WORKSHOPS", body: "Capture ideas across the room." },
  { tag: "04", title: "GROUP DISCUSSIONS", body: "Give every participant a voice." },
];

export default function UseCases() {
  return (
    <section className="border-t border-[#E4E4E0] bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-5 md:px-8">
        <Reveal>
          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#8A8A86]">Use cases</p>
          <h2 className="editorial-tight mt-4 max-w-[700px] text-[36px] font-[700] sm:text-[48px] lg:text-[60px]">
            Built for every table.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {cases.map((c, i) => (
            <Reveal key={c.title} delay={(i % 2) * 0.08}>
              <div className="group relative overflow-hidden rounded-[28px] bg-[#111111] p-8 text-white transition-all hover:-translate-y-[3px] md:p-10 min-h-[240px] flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[12px] text-white/40">{c.tag}</span>
                  <div className="flex items-center gap-[2.5px] opacity-50 transition-opacity group-hover:opacity-100">
                    {[10, 18, 8, 14, 6, 16, 9].map((h, j) => (
                      <span key={j} className="w-[3px] rounded-full bg-[#635BFF]" style={{ height: h }} />
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="editorial-tight text-[28px] font-[700] tracking-[-0.02em] md:text-[36px]">{c.title}</h3>
                  <p className="mt-2 max-w-[360px] text-[15px] leading-relaxed text-white/60">{c.body}</p>
                </div>
                {/* subtle ring */}
                <div className="pointer-events-none absolute -bottom-20 -right-20 h-[240px] w-[240px] rounded-full border border-white/10" />
                <div className="pointer-events-none absolute -bottom-12 -right-12 h-[140px] w-[140px] rounded-full border border-[#635BFF]/30" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
