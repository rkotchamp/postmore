import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Custom hook for updating individual clip properties with optimistic updates
 * Uses TanStack Query mutations following industry best practices
 * 
 * @param {string} projectId - The project ID for cache invalidation
 */
export const useUpdateClip = (projectId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clipId, updates }) => {
      console.log(`🎬 [CLIP-MUTATION] Updating clip ${clipId}:`, updates);
      
      const response = await fetch(`/api/clipper-studio/clips/${clipId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to update clip: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ [CLIP-MUTATION] Successfully updated clip ${clipId}`);
      return data.clip;
    },

    // Optimistic updates - Update UI immediately before API call
    onMutate: async ({ clipId, updates }) => {
      console.log(`⚡ [CLIP-OPTIMISTIC] Applying optimistic update to clip ${clipId}`);
      
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['clips', projectId] });

      // Get current clips data
      const previousClips = queryClient.getQueryData(['clips', projectId]);

      // Optimistically update the clip in the cache
      if (previousClips?.clips) {
        queryClient.setQueryData(['clips', projectId], {
          ...previousClips,
          clips: previousClips.clips.map(clip =>
            clip.id === clipId
              ? { ...clip, ...updates }
              : clip
          )
        });
      }

      // Return context for potential rollback
      return { previousClips };
    },

    // On error, rollback to previous state
    onError: (error, variables, context) => {
      console.error(`❌ [CLIP-MUTATION] Failed to update clip ${variables.clipId}:`, error.message);
      
      if (context?.previousClips) {
        console.log(`⏪ [CLIP-ROLLBACK] Rolling back optimistic update for clip ${variables.clipId}`);
        queryClient.setQueryData(['clips', projectId], context.previousClips);
      }
    },

    // On success, update the cache with server response
    onSuccess: (updatedClip, variables) => {
      console.log(`🎉 [CLIP-MUTATION] Successfully updated clip ${variables.clipId}, updating cache`);
      
      // Update the specific clip in cache with server response
      const currentClips = queryClient.getQueryData(['clips', projectId]);
      if (currentClips?.clips) {
        queryClient.setQueryData(['clips', projectId], {
          ...currentClips,
          clips: currentClips.clips.map(clip =>
            clip.id === variables.clipId
              ? updatedClip
              : clip
          )
        });
      }
    },

    // Always invalidate and refetch clips query after mutation
    onSettled: (data, error, variables) => {
      console.log(`🔄 [CLIP-MUTATION] Invalidating clips cache for project ${projectId}`);
      queryClient.invalidateQueries({ queryKey: ['clips', projectId] });
    },
  });
};

/**
 * Convenience hook specifically for updating clip template headers
 * @param {string} projectId - The project ID
 */
export const useUpdateClipTemplateHeader = (projectId) => {
  const updateClipMutation = useUpdateClip(projectId);

  return {
    updateTemplateHeader: (clipId, templateHeader) => {
      return updateClipMutation.mutate({
        clipId,
        updates: { templateHeader }
      });
    },
    isLoading: updateClipMutation.isPending,
    error: updateClipMutation.error,
  };
};