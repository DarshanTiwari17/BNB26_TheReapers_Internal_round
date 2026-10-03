import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowDown } from "lucide-react";
import HeroAudioVisualization from "./HeroAudioVisualization";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-[76px]">
      <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-5 pb-16 pt-10 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-4 lg:pb-20 lg:pt-14 min-h-[90vh]">
        <div className="max-w-[720px]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#E4E4E0] bg-white px-4 py-1.5"
          >
            <span className="h-[7px] w-[7px] rounded-full bg-[#18A874]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#666]">
              Collaborative audio intelligence
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="editorial-tight mt-6 text-[44px] font-[700] sm:text-[64px] lg:text-[84px] xl:text-[92px]"
          >
            EVERY PHONE HEARS.
            <br />
            <span className="text-[#635BFF]">ROUNDTABLE</span> UNDERSTANDS.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
            className="mt-6 max-w-[520px] text-[19px] font-medium leading-[1.4] tracking-[-0.01em] text-[#111] sm:text-[22px]"
          >
            Turn the phones already on the table into one intelligent microphone.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22 }}
            className="mt-3 max-w-[520px] text-[16px] leading-[1.6] text-[#666]"
          >
            Roundtable combines multiple smartphones to create clearer, speaker-attributed live captions for real-world conversations.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.28 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              to="/create-session"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#111111] px-8 py-4 text-[15px] font-semibold text-white transition-all hover:-translate-y-[2px] hover:shadow-[0_16px_40px_rgba(0,0,0,0.2)]"
            >
              Create a Roundtable
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-[2px]" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#111] bg-transparent px-8 py-4 text-[15px] font-semibold transition-all hover:-translate-y-[2px] hover:bg-white"
            >
              See How It Works
              <ArrowDown className="h-4 w-4" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-8 space-y-1.5"
          >
            <p className="text-[13px] font-medium text-[#111]">No special hardware. No permanent recordings.</p>
            <p className="max-w-[440px] text-[13px] leading-relaxed text-[#8A8A86]">
              Meeting data is automatically deleted 60 minutes after the session ends.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <HeroAudioVisualization />
        </motion.div>
      </div>

      {/* flow strip */}
      <div className="border-t border-[#E4E4E0] bg-white/60">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#8A8A86] md:px-8">
          <span>Multiple phones</span>
          <span className="text-[#635BFF]">→</span>
          <span>Cooperative microphones</span>
          <span className="text-[#635BFF]">→</span>
          <span>AI</span>
          <span className="text-[#635BFF]">→</span>
          <span className="text-[#111]">Live speaker-attributed captions</span>
        </div>
      </div>
    </section>
  );
}
