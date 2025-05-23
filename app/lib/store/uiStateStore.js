import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * @typedef {'media' | 'text'} PostType
 */

/**
 * @typedef {object} UIState
 * @property {number} currentStep
 * @property {PostType} postType
 * @property {string} temporaryText // For active text editing, like captions
 * @property {string} textPostContent // For the body of a text-only post
 * @property {boolean} isSubmitting // Track submission status
 * @property {(step: number | ((prevStep: number) => number)) => void} setCurrentStep
 * @property {(type: PostType) => void} setPostType
 * @property {(text: string) => void} setTemporaryText
 * @property {(text: string) => void} setTextPostContent
 * @property {(isSubmitting: boolean) => void} setIsSubmitting
 * @property {() => void} resetUIState
 */

/** @type {Pick<UIState, 'currentStep' | 'postType' | 'temporaryText' | 'textPostContent' | 'isSubmitting'>} */
const initialState = {
  currentStep: 0,
  postType: "media", // Default value
  temporaryText: "",
  textPostContent: "", // Added for text-only post content
  isSubmitting: false, // Added for submission tracking
};

/** @type {import('zustand').UseBoundStore<import('zustand').StoreApi<UIState>>} */
export const useUIStateStore = create()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentStep: (stepOrFn) =>
        set((/** @type {UIState} */ state) => {
          const nextStep =
            typeof stepOrFn === "function"
              ? stepOrFn(state.currentStep)
              : stepOrFn;
          // Basic bounds check (assuming steps are 0-indexed, adjust upper bound if needed)
          if (nextStep >= 0 && nextStep <= 2) {
            if (state.currentStep === nextStep) return state; // No change
            return { currentStep: nextStep };
          }
          console.warn("setCurrentStep: Invalid step index", nextStep);
          return state; // No change if invalid
        }),

      setPostType: (type) =>
        set((/** @type {UIState} */ state) => {
          if (type !== "media" && type !== "text") {
            console.warn("setPostType: Invalid type", type);
            return state;
          }
          if (state.postType === type) return state; // No change
          // Reset temporary text when switching post type away from text?
          // Consider handling this in component logic where type changes, or add here if needed.
          return { postType: type };
        }),

      setTemporaryText: (text) =>
        set((/** @type {UIState} */ state) => {
          if (typeof text !== "string") {
            console.warn("setTemporaryText: Text must be a string", text);
            return state;
          }
          if (state.temporaryText === text) return state; // No change
          return { temporaryText: text };
        }),

      setTextPostContent: (
        text // Added action
      ) =>
        set((/** @type {UIState} */ state) => {
          if (typeof text !== "string") {
            console.warn("setTextPostContent: Text must be a string", text);
            return state;
          }
          if (state.textPostContent === text) return state; // No change
          return { textPostContent: text };
        }),

      setIsSubmitting: (isSubmitting) =>
        set((/** @type {UIState} */ state) => {
          if (typeof isSubmitting !== "boolean") {
            console.warn(
              "setIsSubmitting: Value must be a boolean",
              isSubmitting
            );
            return state;
          }
          if (state.isSubmitting === isSubmitting) return state; // No change
          return { isSubmitting };
        }),

      resetUIState: () => set({ ...initialState, isSubmitting: false }),
    }),
    {
      name: "ui-state-storage", // Name for localStorage item
      storage: createJSONStorage(() => localStorage),
      // Only persist the postType and textPostContent preference
      partialize: (/** @type {UIState} */ state) => ({
        postType: state.postType,
        textPostContent: state.textPostContent, // Added to partialize
        // Don't persist isSubmitting as we always want to start in non-submitting state
      }),
      // Versioning/migration could be added here later if needed
      // version: 1,
      // migrate: (persistedState, version) => { ... }
    }
  )
);

// Optional: Export selectors if needed, though direct use is common for Zustand
/** @param {UIState} state */
export const selectCurrentStep = (state) => state.currentStep;
/** @param {UIState} state */
export const selectPostType = (state) => state.postType;
/** @param {UIState} state */
export const selectTemporaryText = (state) => state.temporaryText;
/** @param {UIState} state */
export const selectTextPostContent = (state) => state.textPostContent; // Added selector
/** @param {UIState} state */
export const selectIsSubmitting = (state) => state.isSubmitting; // Added selector
