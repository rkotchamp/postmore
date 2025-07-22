"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSubscriptionStore } from "@/app/lib/store/subscriptionStore";
import { useCheckoutStore } from "@/app/lib/store/checkoutStore";
import { useUser } from "@/app/context/UserContext";
import { toast } from "sonner";
import { Card, CardContent } from "@/app/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export const CheckoutSuccess = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useUser();

  const { setCurrentSubscription, setIsLoading, plans } = useSubscriptionStore();
  const { setCheckoutSession, hasValidSession } = useCheckoutStore();

  useEffect(() => {
    const handleCheckoutSuccess = async () => {
      const sessionId = searchParams.get("session_id");
      const checkoutStatus = searchParams.get("checkout");
      const planParam = searchParams.get("plan");

      if (checkoutStatus === "success" && sessionId) {
        try {
          setIsLoading(true);

          // If user is not authenticated, store checkout session and redirect to signup
          if (!user) {
            // Find the selected plan details
            const selectedPlan = plans.find((p) => p.id === planParam);
            
            if (selectedPlan) {
              // Store checkout session data for use after signup
              setCheckoutSession({
                sessionId,
                planId: selectedPlan.id,
                planName: selectedPlan.name,
                planPrice: selectedPlan.price,
              });

              toast.success("Payment successful!", {
                description: "Please create your account to complete the process.",
                duration: 5000,
              });

              // Redirect to signup page
              router.push("/auth/register?checkout=pending");
              return;
            }
          }

          // User is authenticated, proceed with normal verification
          const response = await fetch("/api/checkout/verify-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sessionId }),
          });

          if (!response.ok) {
            throw new Error("Failed to verify checkout session");
          }

          const data = await response.json();

          // Update subscription store with new subscription data
          if (data.subscription) {
            setCurrentSubscription(data.subscription);
          }

          toast.success("Subscription activated!", {
            description:
              "Welcome to your new plan! You can now enjoy all the features.",
            duration: 5000,
          });

          setIsProcessing(false);
        } catch (error) {
          console.error("Error verifying checkout:", error);
          setError(error.message);
          setIsProcessing(false);

          toast.error("Subscription verification failed", {
            description: "Please contact support if the issue persists.",
            duration: 5000,
          });
        } finally {
          setIsLoading(false);
        }
      } else if (checkoutStatus === "cancelled") {
        setIsProcessing(false);
        toast.info("Checkout cancelled", {
          description: "You can restart the checkout process anytime.",
          duration: 3000,
        });
      } else {
        setIsProcessing(false);
      }
    };

    handleCheckoutSuccess();
  }, [searchParams, setCurrentSubscription, setIsLoading, user, plans, setCheckoutSession, router]);

  const handleContinue = () => {
    router.push("/dashboard");
  };

  if (isProcessing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-semibold mb-2">
              Processing your subscription...
            </h2>
            <p className="text-muted-foreground">
              Please wait while we set up your account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">!</span>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Verification Failed</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => router.push("/prices")} className="w-full">
              Return to Pricing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Welcome aboard!</h2>
          <p className="text-muted-foreground mb-6">
            Your subscription has been activated successfully. You now have
            access to all the features of your plan.
          </p>
          <Button onClick={handleContinue} className="w-full">
            Continue to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
