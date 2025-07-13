"use client";

import { useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Check, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSubscriptionStore } from "@/app/lib/store/subscriptionStore";
import { useStripeCheckout } from "@/app/hooks/useStripeCheckout";
import { useUser } from "@/app/context/UserContext";

export default function PricingPage() {
  const { user } = useUser();
  const {
    plans,
    selectedPlan,
    isCheckoutLoading,
    error,
    setError,
    canUpgrade,
    canDowngrade,
    getCurrentPlanDetails,
  } = useSubscriptionStore();

  const { initiateCheckout, isRedirecting } = useStripeCheckout();

  const currentPlan = getCurrentPlanDetails();

  // Clear any previous errors when component mounts
  useEffect(() => {
    setError(null);
  }, [setError]);

  const handleSelectPlan = async (plan) => {
    try {
      // For demo purposes, we'll show a warning that this is a mock checkout
      toast.info("Demo Mode", {
        description:
          "This is a demo. In production, you would be redirected to Stripe checkout.",
        duration: 4000,
      });

      // Initiate checkout with success/cancel URLs
      await initiateCheckout(plan.id, {
        successUrl: `${window.location.origin}/dashboard?checkout=success&plan=${plan.id}`,
        cancelUrl: `${window.location.origin}/prices?checkout=cancelled`,
        metadata: {
          source: "pricing_page",
          userEmail: user?.email,
        },
      });
    } catch (error) {
      console.error("Error selecting plan:", error);
      toast.error("Failed to select plan", {
        description: "Please try again.",
        duration: 5000,
      });
    }
  };

  const getPlanButtonText = (plan) => {
    if (isRedirecting && selectedPlan === plan.id) {
      return "Redirecting to checkout...";
    }

    if (currentPlan && currentPlan.id === plan.id) {
      return "Current Plan";
    }

    if (currentPlan && canUpgrade(plan.id)) {
      return "Upgrade Plan";
    }

    if (currentPlan && canDowngrade(plan.id)) {
      return "Downgrade Plan";
    }

    return "Start Free Trial";
  };

  const isPlanCurrent = (plan) => {
    return currentPlan && currentPlan.id === plan.id;
  };

  const isPlanDisabled = (plan) => {
    return isCheckoutLoading || isRedirecting || isPlanCurrent(plan);
  };

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
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative transition-all duration-300 hover:shadow-lg ${
                plan.popular
                  ? "border-primary shadow-xl scale-105 ring-2 ring-primary/20"
                  : "border-gray-200 dark:border-gray-700"
              } ${isPlanCurrent(plan) ? "bg-primary/5 border-primary/50" : ""}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary hover:bg-primary/90">
                  Most Popular
                </Badge>
              )}

              {isPlanCurrent(plan) && (
                <Badge className="absolute -top-3 right-4 bg-green-500 hover:bg-green-600">
                  Current
                </Badge>
              )}

              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">
                    ${plan.price}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <CardDescription className="mt-4 text-base">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground text-sm">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    isPlanCurrent(plan)
                      ? "bg-green-600 hover:bg-green-700"
                      : plan.popular
                      ? "bg-primary hover:bg-primary/90"
                      : "bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                  }`}
                  size="lg"
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isPlanDisabled(plan)}
                >
                  {(isCheckoutLoading || isRedirecting) &&
                  selectedPlan === plan.id ? (
                    <div className="flex items-center gap-2">
                      <span className="animate-spin mr-1">
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      </span>
                      {isRedirecting ? "Redirecting..." : "Processing..."}
                    </div>
                  ) : (
                    getPlanButtonText(plan)
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

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
