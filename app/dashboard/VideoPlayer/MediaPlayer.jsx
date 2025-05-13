"use client";

import { useState, useEffect, useRef } from "react";
import { usePostStore } from "@/app/lib/store/postStore";

/**
 * A custom media player component that handles both images and videos
 * with proper blob URL management and resource cleanup.
 *
 * @param {Object} props
 * @param {File|string} props.file - The File object or URL string
 * @param {string} props.type - "video" or "image"
 * @param {string} props.id - Unique ID for the media
 * @param {Object} props.controls - Controls configuration
 */
export function MediaPlayer({ file, type, id, controls = true }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const mediaRef = useRef(null);

  // Get the custom thumbnail for videos from postStore
  const getVideoThumbnail = usePostStore((state) => state.getVideoThumbnail);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [showPoster, setShowPoster] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  // Create blob URL only once when component mounts or file changes
  useEffect(() => {
    setIsLoaded(false);
    setError(null);

    let url = null;

    // Clear any existing blob URL
    if (blobUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(blobUrl);
    }

    // Only create a blob URL if we have a File object
    if (file instanceof File) {
      try {
        url = URL.createObjectURL(file);
        setBlobUrl(url);
      } catch (err) {
        console.error("Error creating blob URL:", err);
        setError("Failed to create media preview");
      }
    } else if (typeof file === "string") {
      // Use the string URL directly
      setBlobUrl(file);
    } else {
      setError("Invalid media source");
    }

    // Clean up on unmount or when file changes
    return () => {
      if (url?.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file, id]);

  // Create thumbnail URL from the custom thumbnail if available
  useEffect(() => {
    let url = null;

    // Only for videos
    if (type === "video" && id) {
      const thumbnailFile = getVideoThumbnail(id);

      // Clear any existing thumbnail URL
      if (thumbnailUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(thumbnailUrl);
      }

      if (thumbnailFile instanceof File) {
        try {
          url = URL.createObjectURL(thumbnailFile);
          setThumbnailUrl(url);

          // Always show the poster when a new thumbnail is set
          setShowPoster(true);

          // Reset video state since we've changed the thumbnail
          setIsPaused(true);
          setIsPlaying(false);

          // Force the video to refresh with the new poster
          if (mediaRef.current) {
            const currentTime = mediaRef.current.currentTime;
            mediaRef.current.load();
            // Restore position after load
            mediaRef.current.currentTime = currentTime;
          }
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
  }, [type, id, getVideoThumbnail]);

  // Handle successful media loading
  const handleLoaded = () => {
    setIsLoaded(true);
    setError(null);
  };

  // Handle media loading errors
  const handleError = (e) => {
    console.error("Media loading error:", e);
    setError("Failed to load media");
    setIsLoaded(false);
  };

  // For video elements, we want to ensure proper playback
  const handleCanPlay = () => {
    setIsLoaded(true);

    // Try to ensure video metadata is loaded
    if (type === "video" && mediaRef.current) {
      if (mediaRef.current.readyState < 1) {
        mediaRef.current.load();
      }

      // Sync our state with the actual video element state
      syncVideoState();
    }
  };

  // Sync our state variables with the actual video element state
  const syncVideoState = () => {
    if (mediaRef.current) {
      const video = mediaRef.current;
      const videoIsPlaying = !!(
        video.currentTime > 0 &&
        !video.paused &&
        !video.ended &&
        video.readyState > 2
      );

      setIsPlaying(videoIsPlaying);
      setIsPaused(!videoIsPlaying);

      // If we have a thumbnail and the video is not playing, show the poster
      if (thumbnailUrl && !videoIsPlaying) {
        setShowPoster(true);
      } else {
        setShowPoster(false);
      }
    }
  };

  // Hide poster when video starts playing
  const handlePlay = () => {
    setShowPoster(false);
    setIsPaused(false);
    setIsPlaying(true);
  };

  // Show poster when video is paused
  const handlePause = () => {
    setIsPaused(true);
    setIsPlaying(false);
    if (thumbnailUrl) {
      setShowPoster(true);
    }
  };

  // Show poster when video ends
  const handleEnded = () => {
    setIsPaused(true);
    setIsPlaying(false);
    if (thumbnailUrl) {
      setShowPoster(true);
    }
  };

  // Handle mouse events for hover state
  const handleMouseEnter = () => {
    setIsHovering(true);
    if (!isPlaying && thumbnailUrl) {
      setShowPoster(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (isPlaying) {
      setShowPoster(false);
    }
  };

  if (!blobUrl) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-muted/40 rounded">
        <p className="text-sm text-muted-foreground">
          {error || "Preparing media..."}
        </p>
      </div>
    );
  }

  if (type === "video") {
    return (
      <div
        className="relative w-full h-full flex items-center justify-center bg-black/5"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
            <div className="animate-pulse text-sm text-muted-foreground">
              Loading video...
            </div>
          </div>
        )}

        {/* Display thumbnail as poster if available */}
        {thumbnailUrl && showPoster && isLoaded && (
          <div
            className="absolute inset-0 z-10 cursor-pointer"
            onClick={() => {
              if (mediaRef.current) {
                mediaRef.current.play();
                setShowPoster(false);
                setIsPaused(false);
              }
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt="Video thumbnail"
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            </div>
          </div>
        )}

        <video
          ref={mediaRef}
          src={blobUrl}
          className="w-full h-full object-contain"
          controls={controls}
          preload="auto"
          playsInline
          crossOrigin="anonymous"
          onLoadedData={handleLoaded}
          onCanPlay={handleCanPlay}
          onError={handleError}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          poster={thumbnailUrl || undefined}
        />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
            <p className="text-sm text-destructive px-4 py-2 bg-destructive/10 rounded">
              {error}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Default to image rendering
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-muted/10">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
          <div className="animate-pulse text-sm text-muted-foreground">
            Loading image...
          </div>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={mediaRef}
        src={blobUrl}
        alt="Media preview"
        className="w-full h-full object-contain"
        onLoad={handleLoaded}
        onError={handleError}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
          <p className="text-sm text-destructive px-4 py-2 bg-destructive/10 rounded">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
