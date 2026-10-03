import { motion } from "framer-motion";
import { Reveal } from "./Reveal";

const lines = ["ONE CONVERSATION.", "MANY MICROPHONES.", "ONE CLEAR TRANSCRIPT."];

export default function StatementSection() {
  return (
    <section className="bg-[#F7F7F5] py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-5 md:px-8">
        <h2 className="editorial-tight max-w-[1100px] text-[40px] font-[700] sm:text-[56px] lg:text-[76px]">
          {lines.map((line, i) => (
            <span key={line} className="block overflow-hidden">
              <motion.span
                className={"block " + (i === 2 ? "text-[#8A8A86]" : "")}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h2>
        <Reveal delay={0.12}>
          <p className="mt-8 max-w-[560px] text-[18px] leading-[1.6] text-[#666] md:text-[20px]">
            Roundtable doesn&apos;t replace the devices people already have. It makes them work together.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
