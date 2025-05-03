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
      mutationFn: (newMediaItems) => {
        // NOTE: Blob URL cleanup for *removed* items happens
        // within the component where the temporary URLs are managed.

        // Prepare data for IN-MEMORY cache: id, type, fileInfo
        const itemsToCache = newMediaItems.map((item) => ({
          id: item.id,
          type: item.type,
          fileInfo: item.file
            ? {
                name: item.file.name,
                type: item.file.type,
                size: item.file.size,
              }
            : item.fileInfo,
          // Exclude File object from cache
        }));

        // localStorage.setItem("media-items", JSON.stringify(itemsToPersist)); // REMOVED

        // Return the items including File objects for the component's local preview handling
        return newMediaItems;
      },
      onSuccess: (newMediaItems) => {
        // Update query cache with the *in-memory* data format
        const itemsToCache = newMediaItems.map((item) => ({
          id: item.id,
          type: item.type,
          fileInfo: item.file
            ? {
                name: item.file.name,
                type: item.file.type,
                size: item.file.size,
              }
            : item.fileInfo,
        }));
        queryClient.setQueryData([QUERY_KEYS.media], itemsToCache);

        // Also update carousel state in memory
        const newMode =
          itemsToCache.length === 0
            ? "empty"
            : itemsToCache[0].type === "video"
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
        queryClient.setQueryData([QUERY_KEYS.text], newText);
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
