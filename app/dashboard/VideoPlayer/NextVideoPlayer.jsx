"use client";

// NOTE: This is a sample implementation for reference.
// To use this component, you would need to:
// 1. Install next-video: npm install next-video
// 2. Run initialization: npx next-video init
// 3. Configure environment variables for your chosen provider

import { useState, useEffect } from "react";
import Video from "next-video";
import { usePostStore } from "@/app/lib/store/postStore";

/**
 * NextVideoPlayer is an implementation using the next-video library
 * for enhanced video handling capabilities
 *
 * @param {Object} props
 * @param {File|string} props.file - The File object or URL string
 * @param {string} props.id - Unique ID for the video
 * @param {boolean} props.controls - Whether to show player controls
 * @param {string} props.externalThumbnail - Optional external thumbnail URL (e.g. from Firebase storage)
 */
export function NextVideoPlayer({
  file,
  id,
  controls = true,
  externalThumbnail = null,
}) {
  const [videoSource, setVideoSource] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get the custom thumbnail for videos from postStore
  const getVideoThumbnail = usePostStore((state) => state.getVideoThumbnail);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    let blobUrl = null;

    const prepareVideo = async () => {
      try {
        // For a File object, create a blob URL first
        if (file instanceof File) {
          blobUrl = URL.createObjectURL(file);
          setVideoSource(blobUrl);
        }
        // For a string URL, use it directly
        else if (typeof file === "string") {
          setVideoSource(file);
        } else {
          throw new Error("Invalid file source");
        }
      } catch (err) {
        console.error("Error preparing video:", err);
        setError("Could not prepare video for playback");
      } finally {
        setIsLoading(false);
      }
    };

    prepareVideo();

    // Cleanup function
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [file]);

  // Create thumbnail URL from the custom thumbnail if available
  useEffect(() => {
    let url = null;

    // First check if we have an external thumbnail URL
    if (externalThumbnail) {
      setThumbnailUrl(externalThumbnail);
      return;
    }

    // Otherwise check for a thumbnail in postStore
    if (id) {
      const thumbnailFile = getVideoThumbnail(id);

      // Clear any existing thumbnail URL
      if (thumbnailUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(thumbnailUrl);
      }

      if (thumbnailFile instanceof File) {
        try {
          url = URL.createObjectURL(thumbnailFile);
          setThumbnailUrl(url);
        } catch (err) {
          console.error("Error creating thumbnail URL:", err);
          setThumbnailUrl(null);
        }
      } else {
        setThumbnailUrl(null);
      }
    }

    return () => {
      if (url?.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    };
  }, [id, getVideoThumbnail, externalThumbnail, thumbnailUrl]);

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-muted/20 rounded text-destructive">
        <p className="text-sm p-4">{error}</p>
      </div>
    );
  }

  if (isLoading || !videoSource) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-muted/20 rounded">
        <p className="text-sm text-muted-foreground">Loading video...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Video
        src={videoSource}
        controls={controls}
        className="w-full h-full object-contain"
        // Additional next-video specific props:
        poster={thumbnailUrl || `poster-${id}`} // Use custom thumbnail if available, otherwise use next-video's generated poster
        muted={false}
        autoPlay={false}
        loop={false}
        // next-video will optimize this for delivery:
        // - creates multiple resolutions
        // - optimizes for streaming
        // - serves via CDN
        // - supports analytics
      />
    </div>
  );
}

// Usage example in a component:
/*
import { NextVideoPlayer } from "@/app/components/NextVideoPlayer";

export function MyComponent() {
  const videoFile = ...; // File object from input or drop

  return (
    <div className="aspect-video w-full">
      <NextVideoPlayer 
        file={videoFile}
        id="my-video-1"
        controls={true}
      />
    </div>
  );
}
*/
