import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./useMediaQueries";

// Helper to clean up blob URLs (Still needed for *current session* cleanup)
const cleanupBlobUrls = (items) => {
  items?.forEach((item) => {
    // Check specifically for our temporary local preview state, not persisted data
    if (item.localPreviewUrl && item.localPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(item.localPreviewUrl);
    }
  });
};

// Hook for media mutations
export function useMediaMutations() {
  const queryClient = useQueryClient();

  return {
    // Update media items - Updates only in-memory cache, NO localStorage persistence
    updateMedia: useMutation({
      mutationFn: async (newMediaItems) => {
        // The primary role of mutationFn is to perform the async operation (if any)
        // and return the data that onSuccess will use.
        // In this case, newMediaItems already contains the File objects from MediaPosts.jsx
        // No need to create a separate itemsToCache here if it's not used for an async op.
        return newMediaItems; // Pass through the items with File objects
      },
      onSuccess: (newMediaItemsWithFiles) => {
        // Renamed for clarity
        // Update query cache with newMediaItemsWithFiles, which includes File objects
        queryClient.setQueryData([QUERY_KEYS.media], newMediaItemsWithFiles);

        // Also update carousel state in memory based on the items now in cache
        // We should derive the mode from newMediaItemsWithFiles
        const newMode =
          !newMediaItemsWithFiles || newMediaItemsWithFiles.length === 0
            ? "empty"
            : newMediaItemsWithFiles[0].type === "video"
            ? "singleVideo"
            : "multiImage";
        queryClient.setQueryData([QUERY_KEYS.carousel], {
          currentIndex: 0,
          mode: newMode,
        });
      },
    }),

    // Update carousel state - Updates only in-memory cache, NO localStorage persistence
    updateCarouselState: useMutation({
      mutationFn: (newState) => {
        // localStorage.setItem("carousel-state", JSON.stringify(newState)); // REMOVED
        return newState;
      },
      onSuccess: (newState) => {
        queryClient.setQueryData([QUERY_KEYS.carousel], newState);
      },
    }),

    // Update text content - STILL PERSISTS to localStorage
    updateTextContent: useMutation({
      mutationFn: (newText) => {
        try {
          const textToStore = JSON.stringify(newText ?? ""); // Ensure null/undefined becomes empty string
          localStorage.setItem("text-content", textToStore);
          return newText;
        } catch (error) {
          console.error("Error writing text content to localStorage:", error);
          // Optionally re-throw or handle the error
          throw error; // Re-throwing to let the mutation know it failed
        }
      },
      onSuccess: (newText) => {
        queryClient.setQueryData([QUERY_KEYS.text], newText); // This key was removed, should be uiStateStore now
      },
    }),

    // Clear all media - Clears only in-memory cache for media/carousel
    clearMedia: useMutation({
      mutationFn: () => {
        // NOTE: Blob URL cleanup needs to happen in the component
        // localStorage.removeItem("media-items"); // REMOVED
        // localStorage.removeItem("carousel-state"); // REMOVED
        return null;
      },
      onSuccess: () => {
        queryClient.setQueryData([QUERY_KEYS.media], []);
        queryClient.setQueryData([QUERY_KEYS.carousel], {
          currentIndex: 0,
          mode: "empty",
        });
        // NOTE: Does NOT clear persisted text state here.
        // That should be handled separately if needed.
      },
    }),
  };
}
