import { useState, useCallback } from "react";
import { useSubscriptionStore } from "@/app/lib/store/subscriptionStore";
import { toast } from "sonner";

/**
 * Custom hook for handling Stripe checkout integration
 * This hook provides methods to initiate checkout, handle success/failure,
 * and manage checkout state
 */
export const useStripeCheckout = () => {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const {
    selectedPlan,
    setIsCheckoutLoading,
    setError,
    selectPlan,
    setCurrentSubscription,
    getCurrentPriceId,
  } = useSubscriptionStore();

  /**
   * Initiate Stripe checkout for a specific plan
   * @param {string} planId - The ID of the plan to checkout
   * @param {object} options - Additional options for checkout
   * @returns {Promise<void>}
   */
  const initiateCheckout = useCallback(
    async (planId, options = {}) => {
      try {
        setIsCheckoutLoading(true);
        setError(null);
        setIsRedirecting(true);

        // Select the plan in the store
        selectPlan(planId);

        // Prepare checkout data
        const checkoutData = {
          planId,
          priceId: getCurrentPriceId(planId), // Use the correct price ID based on billing period
          successUrl:
            options.successUrl ||
            `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl:
            options.cancelUrl ||
            `${window.location.origin}/prices?checkout=cancelled`,
          metadata: {
            userId: options.userId,
            source: "pricing_page",
            ...options.metadata,
          },
        };

        // Call the API to create Stripe checkout session
        const response = await fetch("/api/checkout/create-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(checkoutData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create checkout session");
        }

        const { sessionId, url } = data;

        // Redirect to Stripe checkout
        if (url) {
          window.location.href = url;
        } else {
          throw new Error("No checkout URL received");
        }
      } catch (error) {
        console.error("Checkout error:", error);
        setError(error.message || "Failed to initiate checkout");
        toast.error("Checkout failed", {
          description: error.message || "Please try again.",
          duration: 5000,
        });
      } finally {
        setIsCheckoutLoading(false);
        setIsRedirecting(false);
      }
    },
    [selectPlan, setIsCheckoutLoading, setError]
  );

  /**
   * Handle successful checkout completion
   * @param {object} sessionData - Data from the completed checkout session
   */
  const handleCheckoutSuccess = useCallback(
    async (sessionData) => {
      try {
        setIsCheckoutLoading(true);

        // Update subscription in store
        if (sessionData.subscription) {
          setCurrentSubscription(sessionData.subscription);
        }

        toast.success("Subscription activated!", {
          description:
            "Welcome to your new plan! You can now enjoy all the features.",
          duration: 5000,
        });

        // TODO: Refresh user data, update UI, etc.
      } catch (error) {
        console.error("Error handling checkout success:", error);
        toast.error("Subscription activation failed", {
          description: "Please contact support if the issue persists.",
          duration: 5000,
        });
      } finally {
        setIsCheckoutLoading(false);
      }
    },
    [setCurrentSubscription, setIsCheckoutLoading]
  );

  /**
   * Handle checkout cancellation
   */
  const handleCheckoutCancel = useCallback(() => {
    toast.info("Checkout cancelled", {
      description: "You can restart the checkout process anytime.",
      duration: 3000,
    });

    // Clear any checkout state
    setIsCheckoutLoading(false);
    setError(null);
  }, [setIsCheckoutLoading, setError]);

  /**
   * Create a customer portal session for managing subscriptions
   * @returns {Promise<void>}
   */
  const createPortalSession = useCallback(async () => {
    try {
      setIsCheckoutLoading(true);

      const response = await fetch("/api/checkout/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No portal URL received");
      }
    } catch (error) {
      console.error("Portal session error:", error);
      toast.error("Failed to open customer portal", {
        description: error.message || "Please try again.",
        duration: 5000,
      });
    } finally {
      setIsCheckoutLoading(false);
    }
  }, [setIsCheckoutLoading]);

  return {
    // State
    isRedirecting,
    selectedPlan,

    // Actions
    initiateCheckout,
    handleCheckoutSuccess,
    handleCheckoutCancel,
    createPortalSession,
  };
};

// Example usage in a component:
/*
const MyComponent = () => {
  const { initiateCheckout, isRedirecting } = useStripeCheckout();
  
  const handlePlanSelect = (planId) => {
    initiateCheckout(planId, {
      successUrl: '/dashboard?welcome=true',
      metadata: { source: 'homepage' }
    });
  };
  
  return (
    <button 
      onClick={() => handlePlanSelect('pro')}
      disabled={isRedirecting}
    >
      {isRedirecting ? 'Redirecting...' : 'Subscribe Now'}
    </button>
  );
};
*/
