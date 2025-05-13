import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "./useMediaQueries";
import { useState, useCallback } from "react";
import useFirebaseStorage from "./useFirebaseStorage";

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const { uploadPostMedia, deleteMultipleFiles, isUploading, uploadProgress } =
    useFirebaseStorage();

  /**
   * Process media files for a post submission
   * Uploads files to Firebase and prepares media data for API
   *
   * @param {Array<File>} files - Media files to process
   * @param {string} postId - Optional post ID for organized storage
   * @returns {Promise<Array>} Processed media objects ready for API
   */
  const processMediaForPost = useCallback(
    async (files, postId = null) => {
      if (!files || !files.length) {
        return [];
      }

      try {
        setIsProcessing(true);
        setError(null);
        setProgress(0);

        // Upload files to Firebase Storage
        const uploadTracker = setInterval(() => {
          if (isUploading) {
            setProgress(uploadProgress);
          }
        }, 100);

        const uploadedFiles = await uploadPostMedia(files, postId);

        clearInterval(uploadTracker);
        setProgress(100);

        // Transform uploaded files into the format expected by the Post API
        const processedMedia = uploadedFiles.map((file) => ({
          id: file.uuid, // Use the UUID as the media ID
          url: file.url,
          path: file.path,
          type: file.type.split("/")[0], // 'image', 'video', etc.
          mimeType: file.type,
          name: file.originalName,
          size: file.size,
        }));

        return processedMedia;
      } catch (err) {
        setError(err.message || "Error processing media files");
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [isUploading, uploadPostMedia, uploadProgress]
  );

  /**
   * Remove media from a post
   * Deletes files from Firebase Storage
   *
   * @param {Array<Object>} mediaItems - Media items to remove
   * @returns {Promise<boolean>} Success status
   */
  const removeMediaFromPost = useCallback(
    async (mediaItems) => {
      if (!mediaItems || !mediaItems.length) {
        return true;
      }

      try {
        setIsProcessing(true);
        setError(null);

        // Extract Firebase storage paths
        const paths = mediaItems
          .filter((item) => item.path)
          .map((item) => item.path);

        if (paths.length === 0) {
          return true;
        }

        // Delete files from Firebase Storage
        await deleteMultipleFiles(paths);

        return true;
      } catch (err) {
        setError(err.message || "Error removing media files");
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [deleteMultipleFiles]
  );

  /**
   * Prepare media data for API submission
   * This transforms client-side media objects to the format expected by the API
   *
   * @param {Array<Object>} mediaItems - Media items from form state
   * @returns {Array<Object>} Formatted media objects for API
   */
  const prepareMediaForSubmission = useCallback((mediaItems) => {
    if (!mediaItems || !mediaItems.length) {
      return [];
    }

    return mediaItems.map((media) => ({
      id: media.id,
      url: media.url,
      type: media.type,
      mimeType: media.mimeType,
      size: media.size,
    }));
  }, []);

  return {
    isProcessing,
    progress,
    error,
    processMediaForPost,
    removeMediaFromPost,
    prepareMediaForSubmission,
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
