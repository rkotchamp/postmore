import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CLIPPER_QUERY_KEYS } from "./useClipperQueries";
import { useState, useCallback } from "react";
import { uploadClipperThumbnail } from "@/app/lib/storage/firebase";

/**
 * Hook for ClipperStudio mutations
 */
export function useClipperMutations() {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  /**
   * Process video file for ClipperStudio project
   * Handles file upload and thumbnail extraction
   * 
   * @param {File} file - Video file to process
   * @param {string} projectId - Project ID for organized storage
   * @returns {Promise<Object>} Processed video data ready for API
   */
  const processVideoFile = useCallback(
    async (file, projectId = null) => {
      if (!file) {
        throw new Error("Video file is required");
      }

      try {
        setIsProcessing(true);
        setError(null);
        setProgress(0);

        // Create form data for video upload
        const formData = new FormData();
        formData.append("video", file);
        if (projectId) {
          formData.append("projectId", projectId);
        }

        setProgress(25);

        // Upload video and extract metadata
        const uploadResponse = await fetch("/api/clipper-studio/video-processing/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        const uploadData = await uploadResponse.json();
        setProgress(75);

        // Extract and upload thumbnail if available
        let thumbnailUrl = null;
        if (uploadData.thumbnailFile) {
          try {
            const thumbnailResult = await uploadClipperThumbnail(
              uploadData.thumbnailFile,
              projectId || "temp"
            );
            thumbnailUrl = thumbnailResult.url;
          } catch (thumbnailError) {
            console.warn("Thumbnail upload failed:", thumbnailError);
            // Continue without thumbnail
          }
        }

        setProgress(100);

        return {
          ...uploadData,
          thumbnailUrl,
          originalVideo: {
            filename: file.name,
            size: file.size,
            type: file.type,
            url: uploadData.videoUrl,
            thumbnailUrl,
            ...uploadData.metadata,
          },
        };

      } catch (err) {
        setError(err.message || "Error processing video file");
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return {
    isProcessing,
    progress,
    error,
    processVideoFile,

    // Create new video project
    createProject: useMutation({
      mutationFn: async ({ sourceType, sourceUrl, originalVideo, metadata }) => {
        const response = await fetch("/api/clipper-studio/projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sourceType,
            sourceUrl,
            originalVideo,
            metadata,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to create project: ${response.statusText}`);
        }

        return response.json();
      },
      onSuccess: (data) => {
        // Invalidate and refetch projects list
        queryClient.invalidateQueries({ queryKey: [CLIPPER_QUERY_KEYS.projects] });
        
        // Add the new project to the cache
        queryClient.setQueryData(
          [CLIPPER_QUERY_KEYS.project, data.project.id],
          data
        );
      },
    }),

    // Update existing video project
    updateProject: useMutation({
      mutationFn: async ({ projectId, updates }) => {
        const response = await fetch(`/api/clipper-studio/projects/${projectId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to update project: ${response.statusText}`);
        }

        return response.json();
      },
      onSuccess: (data, variables) => {
        // Update the specific project in cache
        queryClient.setQueryData(
          [CLIPPER_QUERY_KEYS.project, variables.projectId],
          data
        );

        // Invalidate projects list to refresh counts/status
        queryClient.invalidateQueries({ queryKey: [CLIPPER_QUERY_KEYS.projects] });
      },
    }),

    // Delete video project
    deleteProject: useMutation({
      mutationFn: async (projectId) => {
        const response = await fetch(`/api/clipper-studio/projects/${projectId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to delete project: ${response.statusText}`);
        }

        return response.json();
      },
      onSuccess: (data, projectId) => {
        // Remove project from cache
        queryClient.removeQueries({
          queryKey: [CLIPPER_QUERY_KEYS.project, projectId],
        });

        // Invalidate projects list
        queryClient.invalidateQueries({ queryKey: [CLIPPER_QUERY_KEYS.projects] });
      },
    }),

    // Save project (remove auto-delete)
    saveProject: useMutation({
      mutationFn: async (projectId) => {
        const response = await fetch(`/api/clipper-studio/projects/${projectId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            saveProject: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to save project: ${response.statusText}`);
        }

        return response.json();
      },
      onSuccess: (data, projectId) => {
        // Update project in cache
        queryClient.setQueryData(
          [CLIPPER_QUERY_KEYS.project, projectId],
          data
        );

        // Invalidate projects list to refresh save status
        queryClient.invalidateQueries({ queryKey: [CLIPPER_QUERY_KEYS.projects] });
      },
    }),

    // Start video transcription
    startTranscription: useMutation({
      mutationFn: async ({ projectId, options = {} }) => {
        const response = await fetch("/api/clipper-studio/video-processing/transcription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId,
            ...options,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to start transcription: ${response.statusText}`);
        }

        return response.json();
      },
      onSuccess: (data, variables) => {
        // Update project status
        queryClient.setQueryData(
          [CLIPPER_QUERY_KEYS.project, variables.projectId],
          (oldData) => ({
            ...oldData,
            project: {
              ...oldData?.project,
              status: "processing",
            },
          })
        );

        // Invalidate transcription query to refetch
        queryClient.invalidateQueries({
          queryKey: [CLIPPER_QUERY_KEYS.transcription, variables.projectId],
        });
      },
    }),

    // Start clip detection
    startClipDetection: useMutation({
      mutationFn: async ({ projectId, platform = "general", minEngagementScore = 0.6 }) => {
        const response = await fetch("/api/clipper-studio/video-processing/clip-detection", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId,
            platform,
            minEngagementScore,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to start clip detection: ${response.statusText}`);
        }

        return response.json();
      },
      onSuccess: (data, variables) => {
        // Cache the clip detection results
        queryClient.setQueryData(
          [CLIPPER_QUERY_KEYS.clipDetection, variables.projectId, {
            platform: variables.platform,
            minEngagementScore: variables.minEngagementScore
          }],
          data
        );

        // Update project analytics
        queryClient.setQueryData(
          [CLIPPER_QUERY_KEYS.project, variables.projectId],
          (oldData) => ({
            ...oldData,
            project: {
              ...oldData?.project,
              analytics: {
                ...oldData?.project?.analytics,
                totalClipsGenerated: data.clips?.length || 0,
                lastAccessed: new Date(),
              },
            },
          })
        );
      },
    }),

    // Process video from URL
    processVideoUrl: useMutation({
      mutationFn: async ({ url, options = {} }) => {
        const response = await fetch("/api/clipper-studio/video-processing/url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            ...options,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to process video URL: ${response.statusText}`);
        }

        return response.json();
      },
    }),
  };
}