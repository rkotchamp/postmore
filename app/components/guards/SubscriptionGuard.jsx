"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/context/UserContext";

/**
 * SubscriptionGuard - Protects routes that require an active subscription
 *
 * Checks if the user has an active or trialing subscription.
 * If not, redirects to the pricing page.
 */
export function SubscriptionGuard({ children }) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useUser();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Wait for user data to load
    if (isLoading) {
      return;
    }

    // If not authenticated, middleware should handle this, but double-check
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    // Check subscription status from user profile
    const subscription = user?.subscription;

    // Valid subscription statuses that allow access
    const validStatuses = ["active", "trialing"];
    const hasValidSubscription = subscription && validStatuses.includes(subscription.status);

    if (!hasValidSubscription) {
      // Redirect to pricing page - user needs to subscribe
      router.replace("/prices?source=trial");
      return;
    }

    // User has valid subscription, allow access
    setIsChecking(false);
  }, [user, isLoading, isAuthenticated, router]);

  // Show loading state while checking subscription
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verifying subscription...</p>
        </div>
      </div>
    );
  }

  // User has valid subscription, render children
  return children;
}
