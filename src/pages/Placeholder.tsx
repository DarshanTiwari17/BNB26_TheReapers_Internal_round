import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#111]">
      <Navbar />
      <main className="mx-auto flex max-w-[800px] flex-col items-center px-5 pb-28 pt-[180px] text-center">
        <p className="rounded-full border border-[#E4E4E0] bg-white px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8A86]">
          Coming soon
        </p>
        <h1 className="editorial-tight mt-6 text-[44px] font-[700] sm:text-[64px]">{title}</h1>
        <p className="mt-4 max-w-[480px] text-[16px] leading-relaxed text-[#666]">{body}</p>
        <Link to="/" className="mt-8 rounded-full bg-[#111] px-8 py-3.5 text-[15px] font-semibold text-white transition-all hover:-translate-y-[2px]">
          Back to homepage
        </Link>
      </main>
      <Footer />
    </div>
  );
}
