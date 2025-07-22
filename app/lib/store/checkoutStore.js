import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * @typedef {object} CheckoutSession
 * @property {string} sessionId - Stripe checkout session ID
 * @property {string} planId - Selected plan ID ('basic', 'pro', 'premium')
 * @property {string} planName - Selected plan name
 * @property {number} planPrice - Selected plan price
 * @property {string} status - Checkout status ('pending', 'completed', 'expired')
 * @property {Date} createdAt - When checkout was initiated
 * @property {Date} expiresAt - When checkout session expires
 */

/**
 * @typedef {object} CheckoutState
 * @property {CheckoutSession | null} checkoutSession
 * @property {boolean} isProcessingSignup
 * @property {string | null} error
 * @property {(session: CheckoutSession) => void} setCheckoutSession
 * @property {() => void} clearCheckoutSession
 * @property {(isProcessing: boolean) => void} setIsProcessingSignup
 * @property {(error: string | null) => void} setError
 * @property {() => boolean} hasValidSession
 * @property {() => void} markSessionCompleted
 */

export const useCheckoutStore = create(
  persist(
    (set, get) => ({
      // State
      checkoutSession: null,
      isProcessingSignup: false,
      error: null,

      // Actions
      setCheckoutSession: (session) =>
        set({
          checkoutSession: {
            ...session,
            status: 'pending',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
          error: null,
        }),

      clearCheckoutSession: () =>
        set({
          checkoutSession: null,
          error: null,
        }),

      setIsProcessingSignup: (isProcessing) =>
        set({ isProcessingSignup: isProcessing }),

      setError: (error) => set({ error }),

      hasValidSession: () => {
        const { checkoutSession } = get();
        if (!checkoutSession) return false;
        
        const now = new Date();
        const expiresAt = new Date(checkoutSession.expiresAt);
        
        return (
          checkoutSession.status === 'pending' &&
          now < expiresAt &&
          checkoutSession.sessionId
        );
      },

      markSessionCompleted: () => {
        const { checkoutSession } = get();
        if (checkoutSession) {
          set({
            checkoutSession: {
              ...checkoutSession,
              status: 'completed',
            },
          });
        }
      },
    }),
    {
      name: "checkout-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        checkoutSession: state.checkoutSession,
      }),
    }
  )
);