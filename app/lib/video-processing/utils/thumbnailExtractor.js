/**
 * Thumbnail Extractor using yt-dlp
 * Simple utility to get real video thumbnails
 */

/**
 * Extract thumbnail and metadata from video URL using yt-dlp
 */
export const extractVideoThumbnail = async (url) => {
  try {
    console.log('🔍 [THUMBNAIL] Extracting thumbnail from:', url);
    
    const response = await fetch('/api/video-processing/extract-metadata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Metadata extraction failed');
    }
    
    const metadata = data.metadata;
    
    // Find the best quality thumbnail
    let bestThumbnail = metadata.thumbnail;
    
    if (metadata.thumbnails && metadata.thumbnails.length > 0) {
      // Sort by resolution (width * height) and pick the highest quality
      const sortedThumbnails = metadata.thumbnails
        .filter(t => t.url && t.width && t.height)
        .sort((a, b) => (b.width * b.height) - (a.width * a.height));
      
      if (sortedThumbnails.length > 0) {
        bestThumbnail = sortedThumbnails[0].url;
      }
    }
    
    console.log('✅ [THUMBNAIL] Successfully extracted:', metadata.title);
    
    return {
      thumbnail: bestThumbnail,
      title: metadata.title,
      duration: metadata.duration,
      uploader: metadata.uploader,
      width: metadata.width,
      height: metadata.height,
      originalUrl: url
    };
    
  } catch (error) {
    console.error('❌ [THUMBNAIL] Extraction failed:', error.message);
    
    // Return fallback thumbnail as data URL instead of broken path
    const placeholderSvg = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#374151"/>
      <text x="150" y="100" text-anchor="middle" fill="white" font-family="Arial" font-size="16">Video Preview</text>
    </svg>`;
    
    return {
      thumbnail: `data:image/svg+xml;base64,${btoa(placeholderSvg)}`,
      title: "Video Preview",
      duration: 0,
      uploader: "Unknown",
      error: error.message,
      originalUrl: url
    };
  }
};

/**
 * Generate thumbnail from uploaded video file
 */
export const generateThumbnailFromFile = (file, timeOffset = 5) => {
  return new Promise((resolve, reject) => {
    console.log('🎬 [FILE-THUMBNAIL] Generating from file:', file.name);
    
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.preload = 'metadata';
    video.muted = true; // Required for autoplay in some browsers
    
    video.onloadedmetadata = () => {
      // Set canvas dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Seek to specified time (or 10% of video duration)
      const seekTime = Math.min(timeOffset, video.duration * 0.1);
      video.currentTime = seekTime;
      
      console.log(`📐 [FILE-THUMBNAIL] Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
      console.log(`⏱️ [FILE-THUMBNAIL] Seeking to: ${seekTime}s`);
    };

    video.onseeked = () => {
      try {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            const thumbnailUrl = URL.createObjectURL(blob);
            
            console.log('✅ [FILE-THUMBNAIL] Generated successfully');
            
            resolve({
              thumbnail: thumbnailUrl,
              title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
              duration: video.duration,
              width: video.videoWidth,
              height: video.videoHeight,
              size: file.size,
              type: file.type,
              originalFile: file
            });
          } else {
            reject(new Error('Failed to generate thumbnail blob'));
          }
        }, 'image/jpeg', 0.8);
        
      } catch (error) {
        reject(new Error(`Canvas drawing failed: ${error.message}`));
      }
    };

    video.onerror = (e) => {
      console.error('❌ [FILE-THUMBNAIL] Video error:', e);
      reject(new Error('Failed to load video file'));
    };

    // Create object URL and load video
    const fileUrl = URL.createObjectURL(file);
    video.src = fileUrl;
  });
};

/**
 * Main function to get thumbnail - handles both URLs and files
 */
export const getThumbnail = async (input) => {
  try {
    // Handle uploaded file
    if (input instanceof File) {
      return await generateThumbnailFromFile(input);
    }
    
    // Handle URL
    if (typeof input === 'string') {
      return await extractVideoThumbnail(input);
    }
    
    throw new Error('Invalid input type');
    
  } catch (error) {
    console.error('❌ [THUMBNAIL] Failed to get thumbnail:', error.message);
    
    const errorSvg = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#dc2626"/>
      <text x="150" y="100" text-anchor="middle" fill="white" font-family="Arial" font-size="16">Error Loading Video</text>
    </svg>`;
    
    return {
      thumbnail: `data:image/svg+xml;base64,${btoa(errorSvg)}`,
      title: "Error loading video",
      error: error.message
    };
  }
};