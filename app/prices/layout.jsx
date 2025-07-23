export const metadata = {
  title: "Pricing Plans - PostMoore Content Scheduling App | Social Media Management",
  description: "Choose the perfect PostMoore pricing plan for your social media scheduling needs. Compare our Free, Pro, and Business plans. Start with a 5-day free trial - no commitment required.",
  keywords: [
    "PostMoore pricing",
    "social media scheduler pricing",
    "content scheduling app cost",
    "social media management pricing",
    "YouTube Shorts scheduler price",
    "TikTok scheduler pricing",
    "Instagram scheduler cost",
    "multi-platform posting pricing",
    "social media automation pricing",
    "content calendar pricing",
    "social media tools cost",
    "bulk posting pricing"
  ],
  authors: [{ name: "PostMoore Team" }],
  creator: "PostMoore",
  publisher: "PostMoore",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://postmoo.re"
  ),
  alternates: {
    canonical: "/prices",
  },
  openGraph: {
    title: "PostMoore Pricing Plans - Content Scheduling App for All Budgets",
    description: "Compare PostMoore pricing plans: Free, Pro, and Business options. Schedule content across YouTube, TikTok, Instagram, and more. Start your 5-day free trial today.",
    url: "/prices",
    siteName: "PostMoore",
    images: [
      {
        url: "/og-pricing.png", // You can create this specific image
        width: 1200,
        height: 630,
        alt: "PostMoore Pricing Plans - Social Media Scheduling",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PostMoore Pricing - Social Media Scheduling Plans",
    description: "Compare our flexible pricing plans for social media content scheduling. Free plan available, Pro and Business options. 5-day free trial.",
    images: ["/twitter-pricing.png"], // You can create this specific image
    creator: "@postmoore_",
    site: "@postmoore_",
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
  other: {
    "theme-color": "#7c3aed",
    "color-scheme": "light dark",
  },
};

export default function PricingLayout({ children }) {
  return children;
}