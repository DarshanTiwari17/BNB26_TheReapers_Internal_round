import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-[#E4E4E0] bg-white">
      <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="relative grid h-8 w-8 place-items-center">
                <span className="absolute inset-0 rounded-full border-[1.5px] border-[#111]" />
                <span className="absolute inset-[5px] rounded-full bg-[#111]" />
              </span>
              <span className="text-[18px] font-semibold tracking-[-0.02em]">Roundtable</span>
            </div>
            <p className="mt-4 max-w-[320px] text-[14px] leading-relaxed text-[#666]">
              Roundtable — Every phone hears. Roundtable understands.
            </p>
            <p className="mt-3 max-w-[320px] text-[13px] leading-relaxed text-[#8A8A86]">
              Meeting data automatically deleted 60 minutes after the session ends.
            </p>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8A86]">Product</div>
            <div className="mt-4 flex flex-col gap-2.5 text-[14px] font-medium">
              <Link to="/" className="text-[#666] hover:text-[#111]">Product</Link>
              <a href="/#how-it-works" className="text-[#666] hover:text-[#111]">How It Works</a>
              <a href="/#technology" className="text-[#666] hover:text-[#111]">Technology</a>
              <a href="/#privacy" className="text-[#666] hover:text-[#111]">Privacy</a>
            </div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8A86]">Get started · Coming soon</div>
            <div className="mt-4 flex flex-col gap-2.5 text-[14px] font-medium">
              <Link to="/create-session" className="text-[#666] hover:text-[#111]">Create Session</Link>
              <Link to="/join" className="text-[#666] hover:text-[#111]">Join Session</Link>
              <Link to="/roundtable" className="text-[#666] hover:text-[#111]">Live Roundtable</Link>
              <Link to="/results" className="text-[#666] hover:text-[#111]">Meeting Results</Link>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col justify-between gap-3 border-t border-[#E4E4E0] pt-6 text-[13px] text-[#8A8A86] sm:flex-row">
          <span>© 2026 Roundtable. All rights reserved.</span>
          <span>Multiple phones → one intelligent conversation.</span>
        </div>
      </div>
    </footer>
  );
}
