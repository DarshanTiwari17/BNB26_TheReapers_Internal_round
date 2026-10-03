import { AudioLines, Users, Wind } from "lucide-react";
import { Reveal } from "./Reveal";

const cards = [
  {
    n: "01",
    icon: Users,
    title: "DISTANCE",
    body: "A single microphone cannot hear everyone equally well.",
  },
  {
    n: "02",
    icon: Wind,
    title: "BACKGROUND NOISE",
    body: "Real conversations happen in cafés, classrooms and busy rooms.",
  },
  {
    n: "03",
    icon: AudioLines,
    title: "OVERLAPPING SPEECH",
    body: "When people speak at the same time, ordinary transcription struggles to identify who said what.",
  },
];

export default function ProblemSection() {
  return (
    <section className="border-t border-[#E4E4E0] bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-5 md:px-8">
        <Reveal>
          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#8A8A86]">The problem</p>
          <h2 className="editorial-tight mt-4 max-w-[800px] text-[36px] font-[700] sm:text-[48px] lg:text-[60px]">
            One microphone was never enough.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal key={c.n} delay={i * 0.08}>
              <div className="group h-full rounded-3xl border border-[#E4E4E0] bg-[#F7F7F5] p-8 transition-all hover:-translate-y-[3px] hover:bg-white hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
                <div className="flex items-start justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white border border-[#E4E4E0]">
                    <c.icon className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <span className="font-mono text-[13px] text-[#8A8A86]">{c.n}</span>
                </div>
                <h3 className="mt-8 text-[15px] font-bold uppercase tracking-[0.12em]">{c.title}</h3>
                <p className="mt-3 text-[16px] leading-[1.6] text-[#666]">{c.body}</p>
                <div className="mt-8 flex items-center gap-[3px] opacity-60">
                  {[5, 9, 14, 8, 16, 6, 11, 4, 10, 7, 13, 5].map((h, j) => (
                    <span key={j} className="w-[3px] rounded-full bg-[#CFCFC9]" style={{ height: h }} />
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
