import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { cn } from "../lib/utils";

function RoundMark() {
  return (
    <span className="relative grid h-8 w-8 place-items-center">
      <span className="absolute inset-0 rounded-full border-[1.5px] border-[#111111]" />
      <span className="absolute inset-[5px] rounded-full bg-[#111111]" />
      <span className="absolute -right-[1px] top-1/2 h-[3px] w-[3px] -translate-y-1/2 rounded-full bg-[#635BFF]" />
      <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-[2.5px]">
        <span className="h-[8px] w-[1.6px] rounded-full bg-white" />
        <span className="h-[12px] w-[1.6px] -translate-y-[2px] rounded-full bg-white" />
        <span className="h-[6px] w-[1.6px] rounded-full bg-white" />
      </span>
      {/* orbit dots = participants */}
      <span className="absolute -top-[3px] left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-[#111111] ring-2 ring-[#F7F7F5]" />
      <span className="absolute top-1/2 -left-[3px] h-[5px] w-[5px] -translate-y-1/2 rounded-full bg-[#111111] ring-2 ring-[#F7F7F5]" />
      <span className="absolute top-1/2 -right-[3px] h-[5px] w-[5px] -translate-y-1/2 rounded-full bg-[#635BFF] ring-2 ring-[#F7F7F5]" />
    </span>
  );
}

const centerLinks = [
  { label: "Product", to: "/" },
  { label: "How It Works", to: "/#how-it-works" },
  { label: "Technology", to: "/#technology" },
  { label: "Privacy", to: "/#privacy" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [loc.pathname, loc.hash]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-[#F7F7F5]/85 backdrop-blur-xl border-b border-[#E4E4E0]"
            : "bg-transparent border-b border-transparent"
        )}
      >
        <div className="mx-auto flex h-[76px] max-w-[1400px] items-center justify-between px-5 md:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <RoundMark />
            <span className="text-[18px] font-semibold tracking-[-0.02em]">Roundtable</span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {centerLinks.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="text-[14px] font-medium text-[#666666] transition-colors hover:text-[#111111]"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              to="/join"
              className="rounded-full border border-[#E4E4E0] bg-transparent px-5 py-2.5 text-[14px] font-medium transition-all hover:-translate-y-[1px] hover:border-[#111111]"
            >
              Join Session
            </Link>
            <Link
              to="/create-session"
              className="group rounded-full bg-[#111111] px-5 py-2.5 text-[14px] font-medium text-white transition-all hover:-translate-y-[1px] hover:bg-black hover:shadow-lg"
            >
              Create Session
              <ArrowUpRight className="ml-1 inline h-4 w-4 transition-transform group-hover:translate-x-[1px] group-hover:-translate-y-[1px]" />
            </Link>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="grid h-10 w-10 place-items-center rounded-full border border-[#E4E4E0] lg:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed inset-x-3 top-[84px] z-50 rounded-2xl border border-[#E4E4E0] bg-white p-4 shadow-2xl lg:hidden"
          >
            <div className="flex flex-col">
              {centerLinks.map((l) => (
                <Link key={l.label} to={l.to} className="rounded-xl px-4 py-3 text-[16px] font-medium hover:bg-[#F7F7F5]">
                  {l.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-[#E4E4E0]" />
              <Link to="/join" className="rounded-xl border border-[#E4E4E0] px-4 py-3 text-center text-[15px] font-medium">
                Join Session
              </Link>
              <Link to="/create-session" className="mt-2 rounded-xl bg-[#111111] px-4 py-3 text-center text-[15px] font-medium text-white">
                Create Session
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
