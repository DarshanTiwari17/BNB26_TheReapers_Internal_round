import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

export default function FinalCTA() {
  return (
    <section className="border-t border-[#E4E4E0] bg-[#F7F7F5] py-28 md:py-40 text-center">
      <div className="mx-auto max-w-[900px] px-5">
        <Reveal>
          <h2 className="editorial-tight text-[42px] font-[700] sm:text-[64px] lg:text-[84px]">
            BRING YOUR TABLE TOGETHER.
          </h2>
          <p className="mx-auto mt-6 max-w-[520px] text-[17px] leading-[1.6] text-[#666]">
            Turn the phones already on the table into one intelligent conversation system.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/create-session" className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#111111] px-8 py-4 text-[15px] font-semibold text-white transition-all hover:-translate-y-[2px] hover:shadow-xl">
              Create a Roundtable <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-[2px]" />
            </Link>
            <Link to="/join" className="inline-flex items-center justify-center rounded-full border border-[#111] px-8 py-4 text-[15px] font-semibold transition-all hover:-translate-y-[2px] hover:bg-white">
              Join a Session
            </Link>
          </div>
          <p className="mt-6 text-[13px] text-[#8A8A86]">No account required.</p>
        </Reveal>
      </div>
    </section>
  );
}
