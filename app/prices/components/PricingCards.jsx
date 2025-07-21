"use client";

import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Check } from "lucide-react";
import { useSubscriptionStore } from "@/app/lib/store/subscriptionStore";
import { useStripeCheckout } from "@/app/hooks/useStripeCheckout";
import { useUser } from "@/app/context/UserContext";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * PricingCards Component
 * @param {Object} props
 * @param {'home' | 'pricing'} props.mode - Mode for the component (home or pricing page)
 * @param {string} props.className - Additional CSS classes
 */
export function PricingCards({ mode = "home", className = "" }) {
  const { user } = useUser();
  const [isClient, setIsClient] = useState(false);

  // Always call the hook, but only use it conditionally
  const searchParams = useSearchParams();

  const {
    plans,
    selectedPlan,
    isCheckoutLoading,
    canUpgrade,
    canDowngrade,
    getCurrentPlanDetails,
    selectPlan,
  } = useSubscriptionStore();

  const { initiateCheckout, isRedirecting } = useStripeCheckout();
  const currentPlan = getCurrentPlanDetails();

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle URL parameters for plan selection - only in pricing mode on client side
  useEffect(() => {
    if (mode === "pricing" && isClient && searchParams) {
      const planParam = searchParams.get("plan");
      if (planParam && plans.some((p) => p.id === planParam)) {
        selectPlan(planParam);
      }
    }
  }, [mode, isClient, searchParams, plans, selectPlan]);

  // Handle automatic checkout after login
  useEffect(() => {
    if (mode === "pricing" && isClient && searchParams && user) {
      const planParam = searchParams.get("plan");
      const checkoutParam = searchParams.get("checkout");

      if (
        checkoutParam === "true" &&
        planParam &&
        plans.some((p) => p.id === planParam)
      ) {
        const selectedPlan = plans.find((p) => p.id === planParam);
        if (selectedPlan) {
          // Auto-initiate checkout
          initiateCheckout(selectedPlan.id, {
            successUrl: `${window.location.origin}/dashboard?checkout=success&plan=${selectedPlan.id}`,
            cancelUrl: `${window.location.origin}/prices?checkout=cancelled`,
            metadata: {
              source: "post_login_checkout",
              userEmail: user?.email,
            },
          }).catch((error) => {
            console.error("Auto-checkout failed:", error);
            toast.error("Failed to start checkout", {
              description: "Please try selecting the plan again.",
              duration: 5000,
            });
          });
        }
      }
    }
  }, [mode, isClient, searchParams, user, plans, initiateCheckout]);

  const handleSelectPlan = async (plan) => {
    try {
      // Check if user is authenticated
      if (!user) {
        // If not authenticated, redirect to login with plan selection in callback
        const callbackUrl = encodeURIComponent(
          `/prices?plan=${plan.id}&checkout=true`
        );
        window.location.href = `/auth/login?callbackUrl=${callbackUrl}`;
        return;
      }

      // User is authenticated, proceed with checkout directly
      await initiateCheckout(plan.id, {
        successUrl: `${window.location.origin}/dashboard?checkout=success&plan=${plan.id}`,
        cancelUrl:
          mode === "home"
            ? `${window.location.origin}/?checkout=cancelled`
            : `${window.location.origin}/prices?checkout=cancelled`,
        metadata: {
          source: mode === "home" ? "homepage" : "pricing_page",
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

    // For authenticated users, show appropriate action
    if (user) {
      return mode === "home"
        ? "Start 5 days free trial"
        : "Start 5 days free trial";
    }

    // For unauthenticated users
    return "Start 5 days free trial";
  };

  const isPlanCurrent = (plan) => {
    return mode === "pricing" && currentPlan && currentPlan.id === plan.id;
  };

  const isPlanDisabled = (plan) => {
    return (
      mode === "pricing" &&
      (isCheckoutLoading || isRedirecting || isPlanCurrent(plan))
    );
  };

  const getButtonClassName = (plan) => {
    if (mode === "home") {
      return `w-full ${
        plan.popular
          ? "bg-primary hover:bg-primary/90"
          : "bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
      }`;
    }

    return `w-full ${
      isPlanCurrent(plan)
        ? "bg-green-600 hover:bg-green-700"
        : plan.popular
        ? "bg-primary hover:bg-primary/90"
        : "bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
    }`;
  };

  const getCardClassName = (plan) => {
    const baseClasses = "relative transition-all duration-300 hover:shadow-lg";
    const isSelected = selectedPlan === plan.id;

    if (mode === "home") {
      return `${baseClasses} ${
        plan.popular
          ? "border-primary shadow-xl scale-105"
          : "border-gray-200 dark:border-gray-700"
      }`;
    }

    return `${baseClasses} ${
      plan.popular
        ? "border-primary shadow-xl scale-105 ring-2 ring-primary/20"
        : "border-gray-200 dark:border-gray-700"
    } ${isPlanCurrent(plan) ? "bg-primary/5 border-primary/50" : ""} ${
      isSelected && !isPlanCurrent(plan)
        ? "ring-2 ring-blue-500/50 border-blue-500"
        : ""
    }`;
  };

  return (
    <div className={`grid md:grid-cols-3 gap-8 max-w-6xl mx-auto ${className}`}>
      {plans.map((plan) => (
        <Card key={plan.id} className={getCardClassName(plan)}>
          {plan.popular && (
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary hover:bg-primary/90">
              Most Popular
            </Badge>
          )}

          {mode === "pricing" && isPlanCurrent(plan) && (
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
              className={getButtonClassName(plan)}
              size="lg"
              onClick={() => handleSelectPlan(plan)}
              disabled={isPlanDisabled(plan)}
            >
              {mode === "pricing" &&
              (isCheckoutLoading || isRedirecting) &&
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
  );
}
