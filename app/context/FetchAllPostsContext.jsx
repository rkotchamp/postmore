"use client";

import { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Create context
const AllPostsContext = createContext();

/**
 * Custom hook to fetch and manage all user posts (excluding scheduled)
 * Uses React Query for efficient caching and preventing duplicate fetches
 */
const useFetchAllPosts = () => {
  // React Query hook for fetching all posts
  const {
    data: allPosts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["allPosts"],
    queryFn: async () => {
      const response = await fetch(
        "/api/posts/Get-posts?excludeScheduled=true"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }
      const data = await response.json();
      return data || [];
    },
    // Configure caching and refetching behavior
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    cacheTime: 30 * 60 * 1000, // Keep data in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  // Transform posts for UI with proper date formatting and status indicators
  const transformedPosts = allPosts.map((post) => {
    // Parse the scheduled date/time - safely handle different date formats
    const scheduledAt =
      post.schedule && post.schedule.at
        ? new Date(post.schedule.at)
        : new Date(post.createdAt);

    // Preserve media array structure instead of extracting just URL
    const mediaArray = post.media || [];

    // Format date for display
    const formatDate = (date) => {
      if (!date) return "Unknown date";
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    };

    // Format time for display
    const formatTime = (date) => {
      if (!date) return "Unknown time";
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(date);
    };

    // Determine status color and indicator
    const getStatusIndicator = (status, results) => {
      switch (status) {
        case "published":
          return {
            color: "green",
            label: "Published",
            bgColor: "bg-green-100",
            textColor: "text-green-800",
            borderColor: "border-green-200",
          };
        case "failed":
          return {
            color: "red",
            label: "Failed",
            bgColor: "bg-red-100",
            textColor: "text-red-800",
            borderColor: "border-red-200",
          };
        case "pending":
          return {
            color: "yellow",
            label: "Pending",
            bgColor: "bg-yellow-100",
            textColor: "text-yellow-800",
            borderColor: "border-yellow-200",
          };
        case "draft":
          return {
            color: "gray",
            label: "Draft",
            bgColor: "bg-gray-100",
            textColor: "text-gray-800",
            borderColor: "border-gray-200",
          };
        default:
          return {
            color: "gray",
            label: "Unknown",
            bgColor: "bg-gray-100",
            textColor: "text-gray-800",
            borderColor: "border-gray-200",
          };
      }
    };

    return {
      id: post._id,
      contentType: post.contentType,
      text: post.text,
      media: mediaArray, // Preserve full media array structure
      caption: post.captions?.single || post.text || "",
      captions: post.captions,
      scheduledDate: formatDate(scheduledAt),
      scheduledTime: formatTime(scheduledAt),
      socialAccounts: post.accounts || [],
      accounts: post.accounts || [],
      status: post.status,
      statusIndicator: getStatusIndicator(post.status, post.results),
      results: post.results || [],
      createdAt: post.createdAt ? new Date(post.createdAt) : null,
      updatedAt: post.updatedAt ? new Date(post.updatedAt) : null,
      originalPost: post,
    };
  });

  return {
    allPosts: transformedPosts,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Custom hook for invalidating all posts cache
 * Call this when posts are created, updated, or deleted
 */
export function useInvalidateAllPosts() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries(["allPosts"]);
  };
}

/**
 * Custom hook to use all posts context
 * @returns {Object} All posts data and methods
 */
export function useAllPostsContext() {
  const context = useContext(AllPostsContext);
  if (!context) {
    throw new Error(
      "useAllPostsContext must be used within an AllPostsProvider"
    );
  }
  return context;
}

/**
 * Provider component that provides all posts context to its children
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement} Provider component
 */
export function AllPostsProvider({ children }) {
  const allPostsData = useFetchAllPosts();

  return (
    <AllPostsContext.Provider value={allPostsData}>
      {children}
    </AllPostsContext.Provider>
  );
}

/**
 * Custom hook that provides a convenient way to access all posts
 * @returns {Object} All posts data and methods
 */
export function useAllPosts() {
  return useAllPostsContext();
}
