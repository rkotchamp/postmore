import { Header } from "@/app/components/HomePage/Header";
import { Footer } from "@/app/components/HomePage/Footer";
import { PrivacyContent } from "@/app/components/privacy-compo/Privacy-content";

export const metadata = {
  title: "Privacy Policy & Terms of Service - PostMoore",
  description:
    "Learn about PostMoore's privacy practices and terms of service. We respect your privacy and are committed to protecting your personal data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <PrivacyContent />
      <Footer />
    </div>
  );
}
