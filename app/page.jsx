import { Header } from "@/app/components/HomePage/Header";
import { Hero } from "@/app/components/HomePage/Hero";
import { Features } from "@/app/components/HomePage/Features";
import { Platforms } from "@/app/components/HomePage/Platform";
import { Testimonials } from "@/app/components/HomePage/Testimonials";
import { Pricing } from "@/app/components/HomePage/Pricing";
import { CTA } from "@/app/components/HomePage/CTA";
import { Footer } from "@/app/components/HomePage/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Platforms />
      <Features />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}
// tried
