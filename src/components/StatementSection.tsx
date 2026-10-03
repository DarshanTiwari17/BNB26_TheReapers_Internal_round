import { Reveal } from "./Reveal";

export default function StatementSection() {
  return (
    <section className="bg-[#F7F7F5] py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-5 md:px-8">
        <Reveal>
          <h2 className="editorial-tight max-w-[1100px] text-[40px] font-[700] sm:text-[56px] lg:text-[76px]">
            ONE CONVERSATION.
            <br />
            MANY MICROPHONES.
            <br />
            <span className="text-[#8A8A86]">ONE CLEAR TRANSCRIPT.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mt-8 max-w-[560px] text-[18px] leading-[1.6] text-[#666] md:text-[20px]">
            Roundtable doesn&apos;t replace the devices people already have. It makes them work together.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
