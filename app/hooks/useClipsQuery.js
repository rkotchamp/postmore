import { useQuery } from '@tanstack/react-query';

/**
 * TanStack Query hook for fetching clips data with optimal caching
 * @param {string} projectId - The project ID to fetch clips for
 * @param {Object} options - Additional query options
 */
export const useClipsQuery = (projectId, options = {}) => {
  return useQuery({
    queryKey: ['clips', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      
      
      const response = await fetch(`/api/clipper-studio/projects/${projectId}/clips`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch clips: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return data;
    },
    enabled: !!projectId, // Only run query if projectId exists
    staleTime: 5 * 60 * 1000, // 5 minutes - clips data doesn't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
    retry: 3, // Retry failed requests 3 times
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    ...options,
  });
};

/**
 * Hook to get the best preview video from clips data
 * @param {Array} clips - Array of clips
 */
export const useBestPreviewVideo = (clips) => {
  if (!clips || clips.length === 0) return null;
  
  // Find clips with video URLs
  const clipsWithVideos = clips.filter(clip => 
    clip.previewVideo?.url || 
    clip.verticalVideoUrl || 
    clip.horizontalVideoUrl || 
    clip.videoUrl
  );
  
  if (clipsWithVideos.length === 0) return null;
  
  // Sort by virality score and return the best one
  const bestClip = clipsWithVideos
    .sort((a, b) => (b.viralityScore || 0) - (a.viralityScore || 0))[0];
  
  
  return bestClip;
};