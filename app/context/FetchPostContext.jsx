"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";

// Create context
const PostContext = createContext();

/**
 * Custom hook to fetch and manage user posts
 * Uses React Query for efficient caching and preventing duplicate fetches
 */
const useFetchPosts = () => {
  // React Query hook for fetching posts
  const {
    data: allPosts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["userPosts"],
    queryFn: async () => {
      const response = await fetch("/api/posts/Get-posts");
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

  // Transform scheduled posts for UI
  const scheduledPosts = allPosts
    .filter(
      (post) =>
        post.status === "scheduled" && post.schedule?.type === "scheduled"
    )
    .map((post) => {
      // Parse the scheduled date/time - safely handle different date formats
      const scheduledAt =
        post.schedule && post.schedule.at
          ? new Date(post.schedule.at)
          : new Date();

      // Extract media URL more reliably
      // The media field is an array of objects with url properties
      let mediaUrl = null;
      let thumbnailUrl = null;

      if (post.media && Array.isArray(post.media) && post.media.length > 0) {
        // Get the first media item that has a url property
        const firstMedia = post.media[0];
        if (firstMedia && firstMedia.url) {
          mediaUrl = firstMedia.url;

          // Extract thumbnail if it exists directly on the media object
          if (firstMedia.thumbnail) {
            thumbnailUrl = firstMedia.thumbnail;
          }

          // For video content, ensure we have a thumbnail
          if (firstMedia.type === "video" && !thumbnailUrl) {
            // If no thumbnail is provided but it's a video, we could provide a default
            // thumbnailUrl = '/images/default-video-thumbnail.jpg';
          }
        }
      }

      // Format accounts for display, using the account references as they are
      const formattedAccounts = (post.accounts || []).map((account) => ({
        id: account.id || account._id || "unknown", // Use account.id as primary identifier (references social accounts collection)
        name: account.name || account.username || "Account",
        email: account.email || "",
        platform: (account.type || account.platform || "other").toLowerCase(),
        // We don't set avatar here since we'll get it from the FetchAllAccountsContext later
      }));

      // Create the formatted post object
      return {
        id: post._id,
        contentType:
          post.contentType ||
          (post.media && post.media.length > 0 ? "media" : "text"),
        text: post.text || "",
        media: mediaUrl,
        thumbnail: thumbnailUrl,
        captions: post.captions || {},
        scheduledTime: scheduledAt.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        scheduledDate: scheduledAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        socialAccounts: formattedAccounts,
        createdAt: post.createdAt ? new Date(post.createdAt) : null,
        updatedAt: post.updatedAt ? new Date(post.updatedAt) : null,
        originalPost: post, // Keep original data for reference if needed
      };
    });

  return {
    allPosts,
    scheduledPosts,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Provider component for posts data
 * Manages the global state of posts using React Query
 */
export function PostProvider({ children }) {
  // Use the hook for fetching posts
  const postsData = useFetchPosts();

  return (
    <PostContext.Provider value={postsData}>{children}</PostContext.Provider>
  );
}

/**
 * Custom hook to use posts context
 * @returns {Object} Posts data and methods
 */
export function usePostContext() {
  const context = useContext(PostContext);
  if (!context) {
    throw new Error("usePostContext must be used within a PostProvider");
  }
  return context;
}
