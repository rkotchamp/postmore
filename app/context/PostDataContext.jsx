"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

// 1. Create the Context
const PostDataContext = createContext(null);

// Initial state for the post data - REMOVED textContent and mediaFiles
const initialPostData = {
  selectedAccounts: [],
  postType: "",
  textContent: "",
  mediaFiles: [],
  scheduleType: "immediate",
  scheduledAt: null,
  captionMode: "single",
  singleCaption: "",
  multiCaptions: {},
  isPosted: false,
};

// 2. Create the Provider Component
export function PostDataProvider({ children }) {
  const [postData, setPostData] = useState(initialPostData);

  // --- Memoized Update Functions ---

  // REMOVED updateTextContent
  // REMOVED addMediaFile
  // REMOVED removeMediaFile

  const addSelectedAccount = useCallback((account) => {
    setPostData((prevData) => {
      // Avoid adding duplicates
      if (prevData.selectedAccounts.some((acc) => acc.id === account.id)) {
        return prevData;
      }
      return {
        ...prevData,
        selectedAccounts: [...prevData.selectedAccounts, account],
      };
    });
  }, []);

  const removeSelectedAccount = useCallback((accountId) => {
    setPostData((prevData) => ({
      ...prevData,
      selectedAccounts: prevData.selectedAccounts.filter(
        (acc) => acc.id !== accountId
      ),
    }));
  }, []);

  const handleCaptionModeChange = useCallback((mode) => {
    setPostData((prevData) => {
      if (prevData.captionMode === mode) return prevData;
      return {
        ...prevData,
        captionMode: mode,
      };
    });
  }, []);

  const setSchedule = useCallback((type, date = null) => {
    setPostData((prevData) => {
      const newScheduledAt = type === "scheduled" ? date : null;
      if (
        prevData.scheduleType === type &&
        prevData.scheduledAt === newScheduledAt
      ) {
        return prevData;
      }
      return {
        ...prevData,
        scheduleType: type,
        scheduledAt: newScheduledAt,
      };
    });
  }, []);

  const resetPostData = useCallback(() => {
    console.log(
      "Resetting PostDataContext state (accounts, schedule, captions)"
    );
    // Note: This only resets context state (accounts, schedule).
    // It does NOT clear persisted text state or session media state.
    // Clearing those might require separate calls to mutations or specific logic.
    setPostData(initialPostData);
  }, []);

  // --- Memoized Context Value ---
  const value = useMemo(
    () => ({
      postData,
      addSelectedAccount,
      removeSelectedAccount,
      handleCaptionModeChange,
      setSchedule,
      resetPostData,
    }),
    [
      postData,
      addSelectedAccount,
      removeSelectedAccount,
      handleCaptionModeChange,
      setSchedule,
      resetPostData,
    ]
  );

  return (
    <PostDataContext.Provider value={value}>
      {children}
    </PostDataContext.Provider>
  );
}

// 3. Create a Custom Hook for easy consumption
export function usePostData() {
  const context = useContext(PostDataContext);
  if (context === null) {
    throw new Error("usePostData must be used within a PostDataProvider");
  }
  return context;
}
