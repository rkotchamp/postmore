"use client";

import { useEffect, Suspense } from "react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSubscriptionStore } from "@/app/lib/store/subscriptionStore";
import { PricingCards } from "@/app/prices/components/PricingCards";

export default function PricingPage() {
  const { error, setError, getCurrentPlanDetails } = useSubscriptionStore();

  const currentPlan = getCurrentPlanDetails();

  // Clear any previous errors when component mounts
  useEffect(() => {
    setError(null);
  }, [setError]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">14-day free trial</span>
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
            Choose Your Perfect Plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Scale your social media presence with our flexible pricing plans.
            All plans include a 14-day free trial with no commitment.
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

        {/* Pricing Cards */}
        <Suspense
          fallback={
            <div className="text-center py-12">Loading pricing options...</div>
          }
        >
          <PricingCards mode="pricing" />
        </Suspense>

        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-left">
                  Can I change plans anytime?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-left">
                  Yes! You can upgrade or downgrade your plan at any time.
                  Changes take effect immediately, and we'll prorate your
                  billing.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-left">
                  What happens after the free trial?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-left">
                  After your 14-day free trial, you'll be charged for your
                  selected plan. You can cancel anytime during the trial with no
                  charges.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-left">
                  Do you offer refunds?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-left">
                  Yes, we offer a 30-day money-back guarantee. If you're not
                  satisfied, contact us within 30 days for a full refund.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-left">Is my data secure?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-left">
                  Absolutely! We use enterprise-grade security with SSL
                  encryption, regular backups, and comply with GDPR and other
                  privacy regulations.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Contact Section */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground text-lg">
            Need a custom plan or have questions?{" "}
            <a
              href="mailto:support@postmore.com"
              className="text-primary hover:text-primary/80 font-semibold"
            >
              Contact our team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
