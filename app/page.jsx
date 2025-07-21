import { Header } from "@/app/components/HomePage/Header";
import { Hero } from "@/app/components/HomePage/Hero";
import { Features } from "@/app/components/HomePage/Features";
import { Platforms } from "@/app/components/HomePage/Platform";
import { Testimonials } from "@/app/components/HomePage/Testimonials";
import { Pricing } from "@/app/components/HomePage/Pricing";
import { SupportedPlatforms } from "@/app/components/HomePage/SupportedPlatforms";
import { CTA } from "@/app/components/HomePage/CTA";
import { Footer } from "@/app/components/HomePage/Footer";

// Metadata for SEO and social sharing
export const metadata = {
  title: "PostMoore - Schedule Posts Across Multiple Social Media Platforms",
  description:
    "postMoore is the ultimate social media scheduling platform. Schedule and publish content to YouTube Shorts, TikTok, Instagram, Bluesky, and more from one dashboard. Save time and grow your social media presence.",
  keywords: [
    "social media scheduler",
    "YouTube Shorts scheduler",
    "TikTok scheduler",
    "Instagram scheduler",
    "Bluesky scheduler",
    "social media management",
    "content scheduling",
    "multi-platform posting",
  ],
  authors: [{ name: "postMoore Team" }],
  creator: "postMoore",
  publisher: "postMoore",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://postmoo.re"
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PostMoore - Schedule Posts Across Multiple Social Media Platforms",
    description:
      "Schedule and publish content to YouTube Shorts, TikTok, Instagram, Bluesky, and more from one dashboard. Save time and grow your social media presence.",
    url: "/",
    siteName: "PostMoore",
    images: [
      {
        url: "/og-image.png", // You'll need to create this image
        width: 1200,
        height: 630,
        alt: "postMoore - Social Media Scheduling Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "postMoore - Schedule Posts Across Multiple Social Media Platforms",
    description:
      "Schedule and publish content to YouTube Shorts, TikTok, Instagram, Bluesky, and more from one dashboard.",
    images: ["/twitter-image.png"], // You'll need to create this image
    creator: "@postmore",
    site: "@postmore",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code", // Add your Google Search Console verification code
    yandex: "your-yandex-verification-code", // Optional
    yahoo: "your-yahoo-verification-code", // Optional
  },
  other: {
    "theme-color": "#000000",
    "color-scheme": "light dark",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "postMoore",
    "application-name": "postMoore",
    "msapplication-TileColor": "#000000",
    "msapplication-config": "/browserconfig.xml", // Optional
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <div className="bg-background">
        <Features />
        <Testimonials />
        <Pricing />
        <SupportedPlatforms />
        <CTA />
      </div>
      <Footer />
    </div>
  );
}
