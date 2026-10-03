import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import StatementSection from "../components/StatementSection";
import ProblemSection from "../components/ProblemSection";
import HowItWorks from "../components/HowItWorks";
import ProductDemo from "../components/ProductDemo";
import TechnologySection from "../components/TechnologySection";
import PrivacySection from "../components/PrivacySection";
import UseCases from "../components/UseCases";
import FinalCTA from "../components/FinalCTA";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#111111]">
      <Navbar />
      <main>
        <Hero />
        <StatementSection />
        <ProblemSection />
        <HowItWorks />
        <ProductDemo />
        <TechnologySection />
        <PrivacySection />
        <UseCases />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
