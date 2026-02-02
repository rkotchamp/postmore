import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch clips for a specific project
 */
export const useProjectClips = (projectId, enabled = true) => {
  return useQuery({
    queryKey: ['project-clips', projectId],
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required');
      }
      
      console.log(`📋 [CLIPS-HOOK] Fetching clips for project: ${projectId}`);
      
      const response = await fetch(`/api/clipper-studio/projects/${projectId}/clips`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`📋 [CLIPS-HOOK] Project ${projectId} not found - returning empty result`);
          return { clips: [], totalClips: 0 };
        }
        throw new Error(`Failed to fetch clips: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ [CLIPS-HOOK] Found ${data.totalClips} clips for project ${projectId}`);
      
      return data;
    },
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 (project not found)
      if (error?.message?.includes('404')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * Hook to fetch clips for multiple projects
 * This is more efficient than individual queries when we need clips for many projects
 */
export const useMultipleProjectClips = (projectIds = [], enabled = true) => {
  return useQuery({
    queryKey: ['multiple-project-clips', projectIds],
    queryFn: async () => {
      if (!projectIds.length) {
        return {};
      }
      
      console.log(`📋 [CLIPS-HOOK] Fetching clips for ${projectIds.length} projects`);
      
      // Fetch clips for all projects in parallel
      const clipPromises = projectIds.map(async (projectId) => {
        try {
          const response = await fetch(`/api/clipper-studio/projects/${projectId}/clips`);
          
          if (!response.ok) {
            if (response.status === 404) {
              return { projectId, clips: [], totalClips: 0, processedClips: 0 };
            }
            throw new Error(`Failed to fetch clips for project ${projectId}: ${response.statusText}`);
          }
          
          const data = await response.json();
          return {
            projectId,
            clips: data.clips,
            totalClips: data.totalClips,
            processedClips: data.processedClips
          };
        } catch (error) {
          console.error(`❌ [CLIPS-HOOK] Error fetching clips for project ${projectId}:`, error);
          return { projectId, clips: [], totalClips: 0, processedClips: 0, error: error.message };
        }
      });
      
      const results = await Promise.all(clipPromises);
      
      // Convert array to object with projectId as key
      const clipsMap = results.reduce((acc, result) => {
        acc[result.projectId] = {
          clips: result.clips,
          totalClips: result.totalClips,
          processedClips: result.processedClips || 0,
          error: result.error
        };
        return acc;
      }, {});
      
      console.log(`✅ [CLIPS-HOOK] Fetched clips for ${Object.keys(clipsMap).length} projects`);
      
      return clipsMap;
    },
    enabled: enabled && projectIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
};