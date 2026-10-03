import { Timer, Lock, ShieldCheck } from "lucide-react";
import { Reveal } from "./Reveal";

const cards = [
  { icon: Timer, title: "EPHEMERAL AUDIO", body: "Audio is processed temporarily." },
  { icon: Lock, title: "SECURE TRANSPORT", body: "Audio is transmitted through secure connections." },
  { icon: ShieldCheck, title: "AUTOMATIC DELETION", body: "Meeting data is automatically destroyed 60 minutes after the session ends." },
];

export default function PrivacySection() {
  return (
    <section id="privacy" className="relative scroll-mt-20 overflow-hidden border-t border-[#E4E4E0] bg-[#F7F7F5] py-24 md:py-32">
      {/* static decorative ring — no scroll movement */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[120px] top-[80px] h-[380px] w-[380px] rounded-full border border-[#E4E4E0]"
      >
        <div className="absolute inset-10 rounded-full border border-[#E4E4E0]/70" />
        <div className="absolute inset-24 rounded-full bg-white/40" />
      </div>
      <div className="relative mx-auto max-w-[1400px] px-5 md:px-8">
        <Reveal>
          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-[#8A8A86]">Privacy</p>
          <h2 className="editorial-tight mt-4 text-[40px] font-[700] sm:text-[56px] lg:text-[72px]">Private by design.</h2>
          <p className="editorial-tight mt-4 max-w-[800px] text-[22px] font-medium leading-[1.3] text-[#666] md:text-[28px]">
            Your conversation shouldn&apos;t become a permanent dataset.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.08}>
              <div className="h-full rounded-3xl border border-[#E4E4E0] bg-white p-8 transition-all hover:-translate-y-[3px] hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#111] text-white">
                  <c.icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <h3 className="mt-8 text-[14px] font-bold uppercase tracking-[0.12em]">{c.title}</h3>
                <p className="mt-3 text-[15px] leading-[1.6] text-[#666]">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.15}>
          <p className="mt-8 text-[13px] text-[#8A8A86]">Downloaded transcripts remain on the user&apos;s device.</p>
        </Reveal>
      </div>
    </section>
  );
}
