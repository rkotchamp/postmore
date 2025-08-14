import { useQuery } from "@tanstack/react-query";

// Query keys for better organization
export const CLIPPER_QUERY_KEYS = {
  projects: "clipper-projects",
  project: "clipper-project",
  videoProcessing: "video-processing",
  transcription: "transcription",
  clipDetection: "clip-detection",
};

/**
 * Hook to fetch user's video projects
 * @param {Object} options - Query options
 * @param {boolean} options.includeUnsaved - Whether to include unsaved projects
 * @param {number} options.limit - Number of projects per page
 * @param {number} options.page - Page number for pagination
 */
export function useClipperProjects(options = {}) {
  const {
    includeUnsaved = true,
    limit = 20,
    page = 1,
    enabled = true,
  } = options;

  return useQuery({
    queryKey: [CLIPPER_QUERY_KEYS.projects, { includeUnsaved, limit, page }],
    queryFn: async () => {
      const params = new URLSearchParams({
        includeUnsaved: includeUnsaved.toString(),
        limit: limit.toString(),
        page: page.toString(),
      });

      const response = await fetch(`/api/clipper-studio/projects?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled,
  });
}

/**
 * Hook to fetch a specific video project
 * @param {string} projectId - The project ID to fetch
 * @param {Object} options - Query options
 */
export function useClipperProject(projectId, options = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: [CLIPPER_QUERY_KEYS.project, projectId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error("Project ID is required");
      }

      const response = await fetch(`/api/clipper-studio/projects/${projectId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch project: ${response.statusText}`);
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 1, // 1 minute
    enabled: enabled && !!projectId,
  });
}

/**
 * Hook to process video URL and extract metadata
 * @param {string} url - Video URL to process
 * @param {Object} options - Query options
 */
export function useVideoMetadata(url, options = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: [CLIPPER_QUERY_KEYS.videoProcessing, "metadata", url],
    queryFn: async () => {
      if (!url) {
        throw new Error("URL is required");
      }

      const response = await fetch(
        "/api/clipper-studio/video-processing/metadata",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch video metadata: ${response.statusText}`
        );
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - metadata doesn't change often
    enabled: enabled && !!url,
    retry: 2,
  });
}

/**
 * Hook to get transcription for a project
 * @param {string} projectId - The project ID
 * @param {Object} options - Query options
 */
export function useTranscription(projectId, options = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: [CLIPPER_QUERY_KEYS.transcription, projectId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error("Project ID is required");
      }

      const response = await fetch(
        `/api/clipper-studio/video-processing/transcription/${projectId}`
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch transcription: ${response.statusText}`
        );
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: enabled && !!projectId,
    retry: 1,
  });
}

/**
 * Hook to get clip detection results for a project
 * @param {string} projectId - The project ID
 * @param {Object} options - Query options including platform settings
 */
export function useClipDetection(projectId, options = {}) {
  const {
    enabled = true,
    platform = "general",
    minEngagementScore = 0.6,
  } = options;

  return useQuery({
    queryKey: [
      CLIPPER_QUERY_KEYS.clipDetection,
      projectId,
      { platform, minEngagementScore },
    ],
    queryFn: async () => {
      if (!projectId) {
        throw new Error("Project ID is required");
      }

      const response = await fetch(
        "/api/clipper-studio/video-processing/clip-detection",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId,
            platform,
            minEngagementScore,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to detect clips: ${response.statusText}`);
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - clip detection is expensive
    enabled: enabled && !!projectId,
    retry: 1,
  });
}

/**
 * Hook to check processing status of a project
 * @param {string} projectId - The project ID
 * @param {Object} options - Query options
 */
export function useProcessingStatus(projectId, options = {}) {
  const {
    enabled = true,
    refetchInterval = 3000, // Poll every 3 seconds
    refetchOnWindowFocus = false,
  } = options;

  return useQuery({
    queryKey: [CLIPPER_QUERY_KEYS.project, projectId, "status"],
    queryFn: async () => {
      if (!projectId) {
        throw new Error("Project ID is required");
      }

      const response = await fetch(`/api/clipper-studio/projects/${projectId}`);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch project status: ${response.statusText}`
        );
      }

      const data = await response.json();
      return {
        status: data.project?.status,
        progress: data.project?.progress,
        errorMessage: data.project?.errorMessage,
        processingStarted: data.project?.processingStarted,
        processingCompleted: data.project?.processingCompleted,
      };
    },
    staleTime: 0, // Always consider stale for real-time updates
    refetchInterval: (data) => {
      // Stop polling if processing is complete or failed
      const status = data?.status;
      return status === "completed" || status === "failed"
        ? false
        : refetchInterval;
    },
    refetchOnWindowFocus,
    enabled: enabled && !!projectId,
  });
}
