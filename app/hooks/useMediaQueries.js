import { useQuery } from "@tanstack/react-query";

// Query keys for better organization
export const QUERY_KEYS = {
  media: "media",
  carousel: "carousel",
  // text: "text", // Removed as text-only post content is now in uiStateStore
  // preview: "preview", // Preview state is now local to MediaPosts
};

// Hook to get media items - ALWAYS returns default empty array on load
export function useMediaItems() {
  return useQuery({
    queryKey: [QUERY_KEYS.media],
    // queryFn: () => { // No localStorage reading
    //   const stored = localStorage.getItem("media-items");
    //   return stored ? JSON.parse(stored) : [];
    // },
    queryFn: () => [], // Always start empty after refresh/load
    staleTime: Infinity, // Still cache in memory for the session
    gcTime: 0, // Optional: Don't keep unused media data in memory long
  });
}

// Hook to get carousel state - ALWAYS returns default state on load
export function useCarouselState() {
  return useQuery({
    queryKey: [QUERY_KEYS.carousel],
    // queryFn: () => { // No localStorage reading
    //   const stored = localStorage.getItem("carousel-state");
    //   return stored
    //     ? JSON.parse(stored)
    //     : { currentIndex: 0, mode: "empty" };
    // },
    queryFn: () => ({ currentIndex: 0, mode: "empty" }), // Always start default after refresh/load
    staleTime: Infinity, // Cache in memory for session
    gcTime: 0, // Optional: Don't keep unused carousel data in memory long
  });
}

// useTextContent function removed as text-only post content is now managed by uiStateStore
