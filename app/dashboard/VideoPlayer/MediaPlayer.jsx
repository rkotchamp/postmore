"use client";

import { useState, useEffect, useRef } from "react";

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
      <div className="relative w-full h-full flex items-center justify-center bg-black/5">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
            <div className="animate-pulse text-sm text-muted-foreground">
              Loading video...
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
