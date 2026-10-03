import { QrCode, Mic, MessagesSquare, Sparkles } from "lucide-react";
import { Reveal } from "./Reveal";

const steps = [
  { n: "01", icon: QrCode, title: "JOIN", body: "Scan a QR code and enter your name." },
  { n: "02", icon: Mic, title: "CONNECT", body: "Allow microphone access." },
  { n: "03", icon: MessagesSquare, title: "TALK", body: "Put your phone on the table and start talking." },
  { n: "04", icon: Sparkles, title: "UNDERSTAND", body: "Roundtable combines the microphone streams and creates live speaker-attributed captions." },
];

export default function HowItWorks() {
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
