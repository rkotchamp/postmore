"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

// 1. Create the Context
const PostDataContext = createContext(null);

// Initial state for the post data
const initialPostData = {
  textContent: "",
  mediaFiles: [], // Array of file objects or URLs
  selectedAccounts: [], // Array of account objects { id: string, platform: string, name: string }
  scheduleType: "immediate", // 'immediate' or 'scheduled'
  scheduledAt: null, // Date object for scheduled posts
  // Add other relevant fields as needed (e.g., tags, location)
};

// 2. Create the Provider Component
export function PostDataProvider({ children }) {
  const [postData, setPostData] = useState(initialPostData);

  // --- Update Functions ---

  const updateTextContent = useCallback((text) => {
    setPostData((prevData) => ({ ...prevData, textContent: text }));
  }, []);

  const addMediaFile = useCallback((file) => {
    setPostData((prevData) => ({
      ...prevData,
      mediaFiles: [...prevData.mediaFiles, file],
    }));
  }, []);

  const removeMediaFile = useCallback((fileToRemove) => {
    setPostData((prevData) => ({
      ...prevData,
      mediaFiles: prevData.mediaFiles.filter((file) => file !== fileToRemove), // Adjust filter logic based on file object structure
    }));
  }, []);

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

  const setSchedule = useCallback((type, date = null) => {
    setPostData((prevData) => ({
      ...prevData,
      scheduleType: type,
      scheduledAt: type === "scheduled" ? date : null,
    }));
  }, []);

  const resetPostData = useCallback(() => {
    setPostData(initialPostData);
  }, []);

  // --- Value provided by the context ---
  const value = {
    postData,
    updateTextContent,
    addMediaFile,
    removeMediaFile,
    addSelectedAccount,
    removeSelectedAccount,
    setSchedule,
    resetPostData,
  };

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
