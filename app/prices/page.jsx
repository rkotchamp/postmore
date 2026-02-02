"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useSubscriptionStore } from "@/app/lib/store/subscriptionStore";
import { PricingCards } from "@/app/prices/components/PricingCards";
import { BillingToggle } from "@/app/components/ui/BillingToggle";
import { FAQ } from "@/app/components/HomePage/FAQ";

// Content configuration based on source parameter
const pageContent = {
  trial: {
    title: "Start Your 5-Day Free Trial",
    description: "Try all features free for 5 days. No charge until your trial ends. Cancel anytime.",
    badge: "5-day free trial",
  },
  upgrade: {
    title: "Upgrade Your Plan",
    description: "Unlock more features and take your social media presence to the next level.",
    badge: "Upgrade available",
  },
  profile_upgrade: {
    title: "Upgrade Your Plan",
    description: "Unlock more features and take your social media presence to the next level.",
    badge: "Upgrade available",
  },
  default: {
    title: "Choose Your Perfect Plan",
    description: "Scale your social media presence with our flexible pricing plans. All plans include a 5-day free trial with no commitment.",
    badge: "5-day free trial",
  },
};

export default function PricingPage() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") || "default";
  const content = pageContent[source] || pageContent.default;

  const { error, setError, getCurrentPlanDetails } = useSubscriptionStore();

  const currentPlan = getCurrentPlanDetails();

  // Clear any previous errors when component mounts
  useEffect(() => {
    setError(null);
  }, [setError]);

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "PostMoore Social Media Scheduler",
    "description": "Professional social media scheduling and content management platform for YouTube, TikTok, Instagram, and more.",
    "brand": {
      "@type": "Brand",
      "name": "PostMoore"
    },
    "offers": [
      {
        "@type": "Offer",
        "name": "Free Plan",
        "price": "0",
        "priceCurrency": "USD",
        "description": "Perfect for getting started with social media scheduling"
      },
      {
        "@type": "Offer", 
        "name": "Pro Plan",
        "price": "19",
        "priceCurrency": "USD",
        "description": "Advanced features for growing businesses and content creators"
      },
      {
        "@type": "Offer",
        "name": "Business Plan", 
        "price": "49",
        "priceCurrency": "USD",
        "description": "Enterprise-level features for teams and agencies"
      }
    ]
  };

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            className="flex items-center gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{content.badge}</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {content.title}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {content.description}
          </p>
        </div>

        {/* Current Plan Display */}
        {currentPlan && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
              <span className="text-sm font-medium">
                Currently on {currentPlan.name} plan
              </span>
            </div>
          </div>
        )}

        {/* Billing Toggle */}
        <BillingToggle />

        {/* Pricing Cards */}
        <Suspense
          fallback={
            <div className="text-center py-12">Loading pricing options...</div>
          }
        >
          <PricingCards mode="pricing" />
        </Suspense>

        {/* FAQ Section */}
        <div className="mt-20">
          <FAQ />
        </div>
      </div>
    </div>
    </>
  );
}
