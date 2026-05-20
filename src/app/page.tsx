import Nav from '@/components/Nav';
import LandingHero from '@/components/landing/LandingHero';
import FourFactors from '@/components/landing/FourFactors';
import WhyDifferent from '@/components/landing/WhyDifferent';
import ClosingCTA from '@/components/landing/ClosingCTA';
import Footer from '@/components/Footer';

export default function LandingPage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <LandingHero />
        <FourFactors />
        <WhyDifferent />
        <ClosingCTA />
      </main>
      <Footer />
    </>
  );
}
