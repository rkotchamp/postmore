import { Header } from "@/app/components/HomePage/Header";
import { Footer } from "@/app/components/HomePage/Footer";
import { PrivacyContent } from "@/app/components/privacy-compo/Privacy-content";

export const metadata = {
  title: "Privacy Policy - PostMoore",
  description:
    "Learn about PostMoore's privacy practices. We respect your privacy and are committed to protecting your personal data when you use our social media scheduling platform.",
  openGraph: {
    title: "Privacy Policy - PostMoore",
    description: "Learn about PostMoore's privacy practices. We respect your privacy and are committed to protecting your personal data when you use our social media scheduling platform.",
    images: [
      {
        url: "/og-privacy.png",
        width: 1200,
        height: 630,
        alt: "PostMoore Privacy Policy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy - PostMoore",
    description: "Learn about PostMoore's privacy practices.",
    images: ["/og-privacy.png"],
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PrivacyContent />
      <Footer />
    </div>
  );
}
