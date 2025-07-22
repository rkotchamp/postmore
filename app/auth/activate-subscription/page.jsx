"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/app/context/UserContext";
import { useSubscriptionStore } from "@/app/lib/store/subscriptionStore";
import { toast } from "sonner";
import { Card, CardContent } from "@/app/components/ui/card";
import { CheckCircle2, Loader2, Crown } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export default function ActivateSubscription() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();
  const [isActivating, setIsActivating] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const { setCurrentSubscription } = useSubscriptionStore();

  const sessionId = searchParams.get("sessionId");
  const planId = searchParams.get("planId");
  const planName = searchParams.get("planName");
  const planPrice = searchParams.get("planPrice");

  useEffect(() => {
    const activateSubscription = async () => {
      // Wait for user to be loaded
      if (isUserLoading) return;

      // Redirect if no user or missing parameters
      if (!user || !sessionId) {
        router.push("/auth/login");
        return;
      }

      try {
        setIsActivating(true);

        // Call the activation API
        const response = await fetch("/api/checkout/activate-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });

        if (response.ok) {
          const data = await response.json();

          // Update subscription store
          if (data.subscription) {
            setCurrentSubscription(data.subscription);
          }

          toast.success("Subscription activated!", {
            description: `Welcome to your ${planName} plan!`,
            duration: 5000,
          });

          setSuccess(true);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to activate subscription");
        }
      } catch (error) {
        console.error("Error activating subscription:", error);
        setError(error.message);

        toast.error("Subscription activation failed", {
          description: "Please contact support to activate your subscription.",
          duration: 5000,
        });
      } finally {
        setIsActivating(false);
      }
    };

    activateSubscription();
  }, [user, isUserLoading, sessionId, planName, setCurrentSubscription, router]);

  const handleContinue = () => {
    router.push("/dashboard?welcome=true");
  };

  if (isUserLoading || isActivating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="rounded-full bg-primary/10 p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">
              Activating your subscription...
            </h2>
            <p className="text-muted-foreground mb-4">
              Please wait while we set up your {planName} plan.
            </p>
            {planPrice && (
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <div className="flex items-center justify-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <span className="font-semibold">{planName} Plan</span>
                  <span className="text-muted-foreground">${planPrice}/month</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">!</span>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Activation Failed</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="space-y-3">
              <Button onClick={() => router.push("/dashboard")} className="w-full">
                Continue to Dashboard
              </Button>
              <Button 
                onClick={() => router.push("/prices")} 
                variant="outline" 
                className="w-full"
              >
                View Pricing Plans
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Welcome aboard!</h2>
            <p className="text-muted-foreground mb-4">
              Your {planName} subscription has been activated successfully.
            </p>
            {planPrice && (
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20 mb-6">
                <div className="flex items-center justify-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <span className="font-semibold">{planName} Plan</span>
                  <span className="text-muted-foreground">${planPrice}/month</span>
                </div>
              </div>
            )}
            <Button onClick={handleContinue} className="w-full">
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}