import { useState, useCallback } from 'react';
import { getThumbnail } from '../lib/video-processing/utils/thumbnailExtractor';

export const useThumbnail = () => {
  const [thumbnailData, setThumbnailData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const extractThumbnail = useCallback(async (input) => {
    if (!input) return;

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🎬 [HOOK] Starting thumbnail extraction...');
      const result = await getThumbnail(input);
      
      console.log('✅ [HOOK] Thumbnail extracted:', result.title);
      setThumbnailData(result);
      return result;
      
    } catch (err) {
      console.error('❌ [HOOK] Thumbnail extraction failed:', err.message);
      setError(err.message);
      
      // Set fallback thumbnail
      const fallback = {
        thumbnail: "/placeholder.svg?height=200&width=300&text=Video+Error",
        title: "Error loading video",
        error: err.message
      };
      
      setThumbnailData(fallback);
      return fallback;
      
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearThumbnail = useCallback(() => {
    setThumbnailData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    thumbnailData,
    isLoading,
    error,
    extractThumbnail,
    clearThumbnail
  };
};