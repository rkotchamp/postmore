import { Header } from "@/app/components/HomePage/Header";
import { Footer } from "@/app/components/HomePage/Footer";
import { PrivacyContent } from "@/app/components/privacy-compo/Privacy-content";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <PrivacyContent />
      <Footer />
    </div>
  );
}
