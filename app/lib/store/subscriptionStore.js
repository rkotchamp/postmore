import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * @typedef {'basic' | 'creator' | 'premium'} PlanType
 * @typedef {'monthly' | 'yearly'} BillingPeriod
 */

/**
 * @typedef {object} PlanPricing
 * @property {number} monthly
 * @property {number} yearly
 * @property {string} monthlyPriceId
 * @property {string} yearlyPriceId
 */

/**
 * @typedef {object} Plan
 * @property {string} id
 * @property {string} name
 * @property {PlanPricing} pricing
 * @property {string} description
 * @property {string[]} features
 * @property {boolean} popular
 * @property {object} limits
 */

/**
 * @typedef {object} Subscription
 * @property {string} id
 * @property {PlanType} planId
 * @property {string} status
 * @property {Date} currentPeriodEnd
 * @property {Date} trialEnd
 * @property {boolean} cancelAtPeriodEnd
 */

/**
 * @typedef {object} SubscriptionState
 * @property {Plan[]} plans
 * @property {Subscription | null} currentSubscription
 * @property {PlanType | null} selectedPlan
 * @property {BillingPeriod} billingPeriod
 * @property {boolean} isLoading
 * @property {string | null} error
 * @property {boolean} isCheckoutLoading
 * @property {(planId: PlanType) => void} selectPlan
 * @property {(subscription: Subscription) => void} setCurrentSubscription
 * @property {(period: BillingPeriod) => void} setBillingPeriod
 * @property {(isLoading: boolean) => void} setIsLoading
 * @property {(error: string | null) => void} setError
 * @property {(isLoading: boolean) => void} setIsCheckoutLoading
 * @property {() => void} clearSelectedPlan
 * @property {() => void} resetSubscriptionState
 * @property {(planId: PlanType) => number} getCurrentPrice
 * @property {(planId: PlanType) => string} getCurrentPriceId
 */

// Default plans configuration
const defaultPlans = [
  {
    id: "basic",
    name: "Basic",
    pricing: {
      monthly: 5,
      yearly: 51, // $51/year as per Stripe
      monthlyPriceId: process.env.STRIPE_MONTHLY_BASIC_PRICE_ID || "price_1RndT7GR3RTuDO76YnIS0frc",
      yearlyPriceId: process.env.STRIPE_YEARLY_BASIC_PRICE_ID || "price_1RndT7GR3RTuDO76OBhqqBqb",
    },
    description: "Perfect for individual creators and small businesses",
    features: [
      "3 social media accounts",
      "30 scheduled posts per month",
      "Basic analytics",
      "Email support",
      "Content calendar",
      "Post scheduling",
    ],
    popular: false,
    limits: {
      accounts: 3,
      posts: 30,
      users: 1,
    },
  },
  {
    id: "creator",
    name: "Creator",
    pricing: {
      monthly: 9,
      yearly: 91.80, // $91.80/year as per Stripe
      monthlyPriceId: process.env.STRIPE_MONTHLY_CREATOR_PRICE_ID || "price_1RndXyGR3RTuDO76l0nsbdWV",
      yearlyPriceId: process.env.STRIPE_YEARLY_CREATOR_PRICE_ID || "price_1RndXyGR3RTuDO76AGpk1MAh",
    },
    description: "Ideal for growing businesses and marketing teams",
    features: [
      "10 social media accounts",
      "Unlimited scheduled posts",
      "Advanced analytics & reporting",
      "Team collaboration (5 users)",
      "AI content suggestions",
      "Priority support",
      "Custom branding",
      "Content templates",
    ],
    popular: true,
    limits: {
      accounts: 10,
      posts: "unlimited",
      users: 5,
    },
  },
  {
    id: "premium",
    name: "Premium",
    pricing: {
      monthly: 19,
      yearly: 193, // $193/year as per Stripe
      monthlyPriceId: process.env.STRIPE_MONTHLY_PREMIUM_PRICE_ID || "price_1RndeEGR3RTuDO76bstknjni",
      yearlyPriceId: process.env.STRIPE_YEARLY_PREMIUM_PRICE_ID || "price_1RndeEGR3RTuDO76JOkEv5YC",
    },
    description: "For large organizations with advanced needs",
    features: [
      "Unlimited social media accounts",
      "Unlimited scheduled posts",
      "Advanced analytics & white-label reports",
      "Unlimited team members",
      "AI content suggestions",
      "24/7 phone support",
      "Custom integrations",
      "Dedicated account manager",
      "Priority processing",
      "Custom workflows",
    ],
    popular: false,
    limits: {
      accounts: "unlimited",
      posts: "unlimited",
      users: "unlimited",
    },
  },
];

/** @type {Pick<SubscriptionState, 'plans' | 'currentSubscription' | 'selectedPlan' | 'billingPeriod' | 'isLoading' | 'error' | 'isCheckoutLoading'>} */
const initialState = {
  plans: defaultPlans,
  currentSubscription: null,
  selectedPlan: null,
  billingPeriod: "monthly", // Default to monthly
  isLoading: false,
  error: null,
  isCheckoutLoading: false,
};

/**
 * Zustand store for managing subscription and pricing state
 * Persists selected plan and subscription data
 */
export const useSubscriptionStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      selectPlan: (planId) => {
        set({ selectedPlan: planId, error: null });
      },

      setCurrentSubscription: (subscription) => {
        set({ currentSubscription: subscription, error: null });
      },

      setIsLoading: (isLoading) => {
        set({ isLoading });
      },

      setError: (error) => {
        set({ error });
      },

      setIsCheckoutLoading: (isCheckoutLoading) => {
        set({ isCheckoutLoading });
      },

      setBillingPeriod: (period) => {
        set({ billingPeriod: period });
      },

      clearSelectedPlan: () => {
        set({ selectedPlan: null });
      },

      resetSubscriptionState: () => {
        set(initialState);
      },

      // Helper functions for pricing
      getCurrentPrice: (planId) => {
        const { plans, billingPeriod } = get();
        const plan = plans.find((p) => p.id === planId);
        return plan ? plan.pricing[billingPeriod] : 0;
      },

      getCurrentPriceId: (planId) => {
        const { plans, billingPeriod } = get();
        const plan = plans.find((p) => p.id === planId);
        return plan ? plan.pricing[`${billingPeriod}PriceId`] : "";
      },

      // Computed getters
      getSelectedPlanDetails: () => {
        const { selectedPlan, plans } = get();
        return plans.find((plan) => plan.id === selectedPlan) || null;
      },

      getCurrentPlanDetails: () => {
        const { currentSubscription, plans } = get();
        if (!currentSubscription) return null;
        return (
          plans.find((plan) => plan.id === currentSubscription.planId) || null
        );
      },

      isOnTrial: () => {
        const { currentSubscription } = get();
        if (!currentSubscription || !currentSubscription.trialEnd) return false;
        return new Date() < new Date(currentSubscription.trialEnd);
      },

      isSubscriptionActive: () => {
        const { currentSubscription } = get();
        if (!currentSubscription) return false;
        return (
          currentSubscription.status === "active" ||
          currentSubscription.status === "trialing"
        );
      },

      canUpgrade: (targetPlanId) => {
        const { currentSubscription, plans, billingPeriod } = get();
        if (!currentSubscription) return true;

        const currentPlan = plans.find(
          (plan) => plan.id === currentSubscription.planId
        );
        const targetPlan = plans.find((plan) => plan.id === targetPlanId);

        if (!currentPlan || !targetPlan) return false;
        return targetPlan.pricing[billingPeriod] > currentPlan.pricing[billingPeriod];
      },

      canDowngrade: (targetPlanId) => {
        const { currentSubscription, plans, billingPeriod } = get();
        if (!currentSubscription) return false;

        const currentPlan = plans.find(
          (plan) => plan.id === currentSubscription.planId
        );
        const targetPlan = plans.find((plan) => plan.id === targetPlanId);

        if (!currentPlan || !targetPlan) return false;
        return targetPlan.pricing[billingPeriod] < currentPlan.pricing[billingPeriod];
      },
    }),
    {
      name: "subscription-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedPlan: state.selectedPlan,
        currentSubscription: state.currentSubscription,
        billingPeriod: state.billingPeriod,
        // Don't persist loading states or errors
      }),
    }
  )
);

// Selectors for better performance
export const selectPlans = (state) => state.plans;
export const selectCurrentSubscription = (state) => state.currentSubscription;
export const selectSelectedPlan = (state) => state.selectedPlan;
export const selectBillingPeriod = (state) => state.billingPeriod;
export const selectIsLoading = (state) => state.isLoading;
export const selectError = (state) => state.error;
export const selectIsCheckoutLoading = (state) => state.isCheckoutLoading;
