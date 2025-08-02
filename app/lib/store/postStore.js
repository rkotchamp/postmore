import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const CURRENT_SCHEMA_VERSION = "1.1.0";

// Initial state matching the relevant parts of the old PostDataContext initial state
const initialState = {
  _version: CURRENT_SCHEMA_VERSION,
  selectedAccounts: [],
  scheduleType: "immediate", // 'immediate' or 'scheduled'
  scheduledAt: new Date(), // Initialize with valid Date, ensures it's always a Date instance
  captionMode: "single", // 'single' or 'multiple'
  singleCaption: "",
  multiCaptions: {}, // { [accountId]: caption } - Changed from platform to accountId
  isPosted: false, // Might be useful later
  lastUpdatedAt: new Date(),
  thumbnails: {}, // { [videoId]: File } - Store thumbnail File objects
  // Consider adding a field for draftId or postId if managing multiple drafts/posts in the store
};

export const usePostStore = create(
  persist(
    (set, get) => ({
      ...initialState,

  // --- Internal helper to update timestamp ---
  _updateTimestamp: () => ({ lastUpdatedAt: new Date() }),

  // --- Actions ---
  addSelectedAccount: (account) =>
    set((state) => {
      if (!account || typeof account.id === "undefined") {
        console.warn("addSelectedAccount: Invalid account provided.", account);
        return state; // No change if account is invalid
      }
      if (state.selectedAccounts.some((acc) => acc.id === account.id)) {
        return state; // Avoid duplicates
      }
      return {
        selectedAccounts: [...state.selectedAccounts, account],
        ...get()._updateTimestamp(),
      };
    }),

  removeSelectedAccount: (accountId) =>
    set((state) => {
      if (typeof accountId === "undefined" || accountId === null) {
        console.warn(
          "removeSelectedAccount: Invalid accountId provided.",
          accountId
        );
        return state; // No change if accountId is invalid
      }
      const initialLength = state.selectedAccounts.length;
      const updatedSelectedAccounts = state.selectedAccounts.filter(
        (acc) => acc.id !== accountId
      );
      if (initialLength === updatedSelectedAccounts.length) {
        return state; // No change if accountId not found
      }

      // Also remove any captions for this account
      const updatedMultiCaptions = { ...state.multiCaptions };
      delete updatedMultiCaptions[accountId];

      return {
        selectedAccounts: updatedSelectedAccounts,
        multiCaptions: updatedMultiCaptions,
        ...get()._updateTimestamp(),
      };
    }),

  setSchedule: (type, date = null) => {
    try {
      let newScheduledAt;

      if (type === "scheduled") {
        if (date instanceof Date && !isNaN(date)) {
          newScheduledAt = date;
        } else if (typeof date === "string" || typeof date === "number") {
          const parsedDate = new Date(date);
          if (isNaN(parsedDate.getTime())) {
            console.warn(
              "setSchedule: Invalid date string/number provided for scheduled type, defaulting to current date/time.",
              date
            );
            newScheduledAt = new Date();
          } else {
            newScheduledAt = parsedDate;
          }
        } else {
          console.warn(
            "setSchedule: Invalid or null date provided for scheduled type, defaulting to current date/time.",
            date
          );
          newScheduledAt = new Date();
        }
      } else if (type === "immediate") {
        newScheduledAt = new Date(); // 'immediate' always sets to current date/time
      } else {
        console.warn(
          "setSchedule: Invalid schedule type provided. No changes made.",
          type
        );
        return; // Exit without calling set if type is invalid
      }

      // Optionally, zero out seconds and milliseconds for consistency if needed for comparisons
      // newScheduledAt.setSeconds(0, 0);

      set((state) => {
        const currentScheduledAt = state.scheduledAt || new Date(0); // Fallback for safety

        // Check if there's an actual change to avoid unnecessary updates and timestamp bumps
        if (
          state.scheduleType === type &&
          currentScheduledAt.getTime() === newScheduledAt.getTime()
        ) {
          return state; // No change
        }
        return {
          scheduleType: type,
          scheduledAt: newScheduledAt,
          ...get()._updateTimestamp(),
        };
      });
    } catch (error) {
      console.error("Error in setSchedule action:", error);
      // Depending on desired robustness, you might want to set a 'scheduleError' field in the store
      // or ensure the state remains consistent. For now, logging the error.
    }
  },

  setCaptionMode: (mode) =>
    set((state) => {
      if (mode !== "single" && mode !== "multiple") {
        console.warn("setCaptionMode: Invalid mode provided.", mode);
        return state; // No change if mode is invalid
      }
      if (state.captionMode === mode) return state; // No change if already set
      return { captionMode: mode, ...get()._updateTimestamp() };
    }),

  updateSingleCaption: (caption) =>
    set((state) => {
      if (typeof caption !== "string") {
        console.warn("updateSingleCaption: Caption must be a string.", caption);
        return state; // No change if caption is not a string
      }
      if (state.singleCaption === caption) return state; // No change if identical
      return { singleCaption: caption, ...get()._updateTimestamp() };
    }),

  // Updated to handle account-specific captions
  updateAccountCaption: (accountId, caption) =>
    set((state) => {
      if (typeof accountId !== "string" && typeof accountId !== "number") {
        console.warn(
          "updateAccountCaption: Account ID must be a string or number.",
          { accountId, caption }
        );
        return state;
      }

      if (typeof caption !== "string") {
        console.warn(
          "updateAccountCaption: Caption must be a string.",
          caption
        );
        return state;
      }

      // Convert accountId to string to ensure consistent keys
      const accountIdStr = String(accountId);

      if (state.multiCaptions[accountIdStr] === caption) return state; // No change

      return {
        multiCaptions: {
          ...state.multiCaptions,
          [accountIdStr]: caption,
        },
        ...get()._updateTimestamp(),
      };
    }),

  // Legacy function maintained for backward compatibility
  updateMultiCaption: (platform, caption) =>
    set((state) => {
      if (typeof platform !== "string" || typeof caption !== "string") {
        console.warn(
          "updateMultiCaption: Platform and caption must be strings.",
          { platform, caption }
        );
        return state;
      }

      // Apply the caption to all accounts of this platform
      const updatedMultiCaptions = { ...state.multiCaptions };
      let changed = false;

      state.selectedAccounts.forEach((account) => {
        if (account.platform === platform) {
          if (updatedMultiCaptions[account.id] !== caption) {
            updatedMultiCaptions[account.id] = caption;
            changed = true;
          }
        }
      });

      if (!changed) return state; // No change

      return {
        multiCaptions: updatedMultiCaptions,
        ...get()._updateTimestamp(),
      };
    }),

  applySingleToAllMulti: () =>
    set((state) => {
      const updatedMultiCaptions = { ...state.multiCaptions };
      let changed = false;

      // Apply single caption to all selected accounts
      state.selectedAccounts.forEach((account) => {
        if (updatedMultiCaptions[account.id] !== state.singleCaption) {
          updatedMultiCaptions[account.id] = state.singleCaption;
          changed = true;
        }
      });

      if (!changed && state.selectedAccounts.length === 0) {
        return state; // No accounts selected
      }

      return {
        multiCaptions: updatedMultiCaptions,
        ...(changed ? get()._updateTimestamp() : {}),
      };
    }),

  // --- Thumbnail actions ---
  setVideoThumbnail: (videoId, thumbnailFile) =>
    set((state) => {
      if (!videoId || !(thumbnailFile instanceof File)) {
        console.warn(
          "setVideoThumbnail: Invalid videoId or thumbnailFile provided.",
          { videoId, thumbnailFile }
        );
        return state; // No change if parameters are invalid
      }

      return {
        thumbnails: {
          ...state.thumbnails,
          [videoId]: thumbnailFile,
        },
        ...get()._updateTimestamp(),
      };
    }),

  removeVideoThumbnail: (videoId) =>
    set((state) => {
      if (!videoId || !state.thumbnails[videoId]) {
        return state; // No change if videoId is invalid or thumbnail doesn't exist
      }

      const updatedThumbnails = { ...state.thumbnails };
      delete updatedThumbnails[videoId];

      return {
        thumbnails: updatedThumbnails,
        ...get()._updateTimestamp(),
      };
    }),

  // Getter for a specific video thumbnail
  getVideoThumbnail: (videoId) => {
    const state = get();
    return state.thumbnails[videoId] || null;
  },

  resetPostConfig: () =>
    set(() => ({
      ...initialState, // Resets to the defined initial state object
      _version: CURRENT_SCHEMA_VERSION, // Ensure version is part of the reset
      lastUpdatedAt: new Date(), // Explicitly set new timestamp for the reset action
      thumbnails: {}, // Clear thumbnails on reset
      // Note: selectedAccounts is reset here. If it should persist across resets,
      // this logic would need to: get().selectedAccounts or similar.
    })),

  // Helper functions for getting captions
  getCaptionForAccount: (accountId) => {
    const state = get();
    if (state.captionMode === "single") {
      return state.singleCaption || "";
    }
    return state.multiCaptions[accountId] || state.singleCaption || "";
  },

  getCaptionForPlatform: (platform) => {
    const state = get();
    if (state.captionMode === "single") {
      return state.singleCaption || "";
    }

    // For platform captions, find one account of that platform and return its caption
    const platformAccount = state.selectedAccounts.find(
      (acc) => acc.platform === platform
    );
    if (platformAccount) {
      return (
        state.multiCaptions[platformAccount.id] || state.singleCaption || ""
      );
    }

    return state.singleCaption || "";
  },
    }),
    {
      name: "post-store-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedAccounts: state.selectedAccounts,
        scheduleType: state.scheduleType,
        scheduledAt: state.scheduledAt,
        captionMode: state.captionMode,
        singleCaption: state.singleCaption,
        multiCaptions: state.multiCaptions,
        // Don't persist thumbnails as they are File objects
        // Don't persist lastUpdatedAt as it should be fresh
      }),
    }
  )
);

// Selectors (exported for convenience)
// For optimal performance in components, use usePostStore with inline, memoized selectors,
// especially for objects or arrays, or use a shallow equality checker.
// Example:
// const scheduleType = usePostStore(state => state.scheduleType); // Fine for primitives
// const selectedAccounts = usePostStore(useCallback(state => state.selectedAccounts, [])); // For arrays/objects if selector itself is stable
// OR for multiple values with a shallow compare:
// import { shallow } from 'zustand/shallow';
// const { field1, field2 } = usePostStore(state => ({ field1: state.field1, field2: state.field2 }), shallow);

export const selectSelectedAccounts = (state) => state.selectedAccounts;
export const selectScheduleType = (state) => state.scheduleType;
export const selectScheduledAt = (state) => state.scheduledAt;
export const selectCaptionMode = (state) => state.captionMode;
export const selectSingleCaption = (state) => state.singleCaption;
export const selectMultiCaptions = (state) => state.multiCaptions;
export const selectPostIsPosted = (state) => state.isPosted;
export const selectLastUpdatedAt = (state) => state.lastUpdatedAt;
export const selectSchemaVersion = (state) => state._version;
