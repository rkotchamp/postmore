import { Header } from "@/app/components/HomePage/Header";
import { Footer } from "@/app/components/HomePage/Footer";
import { TermsContent } from "@/app/components/privacy-compo/Terms-content";

export const metadata = {
  title: "Terms of Service - PostMoore",
  description:
    "Read PostMoore's terms of service. These terms govern your use of our social media scheduling platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <TermsContent />
      <Footer />
    </div>
  );
}