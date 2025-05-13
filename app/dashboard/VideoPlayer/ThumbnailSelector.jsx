"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/app/components/ui/button";
import { Slider } from "@/app/components/ui/slider";
import { Loader2, Camera, Upload } from "lucide-react";
import { createPortal } from "react-dom";

// Utility function to format time for display (mm:ss)
const formatTime = (time) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

// Utility function to create a thumbnail file from a blob
const createThumbnailFile = (blob, videoId) => {
  return new File([blob], `thumbnail-${videoId}-${Date.now()}.jpg`, {
    type: "image/jpeg",
  });
};

// Utility function to capture a frame from a video element to a canvas
const captureVideoFrame = (video, canvas) => {
  // Set canvas dimensions to match video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Draw the current frame to the canvas
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return canvas;
};

// Utility function to create a blob URL and clean up any previous one
const createAndCleanBlobUrl = (blob, previousUrl = null) => {
  // Clean up previous URL if it exists
  if (previousUrl) {
    URL.revokeObjectURL(previousUrl);
  }

  // Create and return new URL
  return URL.createObjectURL(blob);
};

/**
 * A component for selecting a specific frame from a video to use as a thumbnail
 *
 * @param {Object} props
 * @param {File|string} props.videoFile - The video File object or URL
 * @param {string} props.videoId - Unique ID for the video
 * @param {function} props.onThumbnailCapture - Callback when thumbnail is captured (receives File object)
 * @param {function} props.onThumbnailUpload - Callback when thumbnail is uploaded (receives File object)
 * @param {boolean} props.isOpen - Whether the selector is open
 * @param {function} props.onClose - Function to call when closing
 */
export function ThumbnailSelector({
  videoFile,
  videoId,
  onThumbnailCapture,
  onThumbnailUpload,
  isOpen,
  onClose,
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [lastCapturedFile, setLastCapturedFile] = useState(null);
  const [lastUploadedFile, setLastUploadedFile] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Create a blob URL for the video if needed
  useEffect(() => {
    let url = null;

    // Reset state when video changes
    setCurrentTime(0);
    setDuration(0);
    setThumbnailUrl(null);

    // Clean up previous blob URL if it exists
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }

    // Create blob URL if we have a File object
    if (videoFile instanceof File) {
      try {
        url = URL.createObjectURL(videoFile);
        setBlobUrl(url);
      } catch (err) {
        console.error("Error creating blob URL:", err);
      }
    } else if (typeof videoFile === "string") {
      // Use the string URL directly
      setBlobUrl(videoFile);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [videoFile]);

  // Clean up thumbnail URL on unmount
  useEffect(() => {
    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, []);

  // Handle video metadata loading to get duration
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      // Seek to 0.5 seconds to show a more representative frame
      videoRef.current.currentTime = 0.5;
    }
  };

  // Update current time as video plays
  const handleTimeUpdate = () => {
    if (!isScrubbing && videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Handle play/pause toggle
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Update video current time when slider changes
  const handleSliderChange = (value) => {
    if (videoRef.current && duration > 0) {
      const newTime = value[0];
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Handle the done button click
  const handleDone = () => {
    try {
      // If we have a captured thumbnail, send it again before closing
      if (lastCapturedFile && onThumbnailCapture) {
        onThumbnailCapture(lastCapturedFile);
      }
      // If we have an uploaded thumbnail, send it again before closing
      else if (lastUploadedFile && onThumbnailUpload) {
        onThumbnailUpload(lastUploadedFile);
      }
    } catch (err) {
      console.error("Error processing thumbnail before close:", err);
    }
    // Always close the selector
    onClose();
  };

  // Capture the current frame as a thumbnail
  const captureThumbnail = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);

    try {
      // Pause video if it's playing
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      }

      // Capture frame to canvas
      captureVideoFrame(videoRef.current, canvasRef.current);

      // Convert canvas to blob
      canvasRef.current.toBlob(
        (blob) => {
          if (blob) {
            // Create a new thumbnail URL
            const newThumbnailUrl = createAndCleanBlobUrl(blob, thumbnailUrl);
            setThumbnailUrl(newThumbnailUrl);

            // Create a File object from the blob
            const thumbnailFile = createThumbnailFile(blob, videoId);

            // Store the file for later use
            setLastCapturedFile(thumbnailFile);
            setLastUploadedFile(null); // Clear any uploaded file

            // Call the callback with the thumbnail File
            if (onThumbnailCapture) {
              onThumbnailCapture(thumbnailFile);
            }
          }
          setIsCapturing(false);
        },
        "image/jpeg",
        0.95
      ); // High quality JPEG
    } catch (error) {
      console.error("Error capturing thumbnail:", error);
      setIsCapturing(false);
    }
  };

  // Handle upload from device
  const handleUpload = (event) => {
    const file = event.target.files?.[0];

    if (file && file.type.startsWith("image/")) {
      // Create thumbnail URL for preview
      const newThumbnailUrl = createAndCleanBlobUrl(file, thumbnailUrl);
      setThumbnailUrl(newThumbnailUrl);

      // Store the file for later use
      setLastUploadedFile(file);
      setLastCapturedFile(null); // Clear any captured file

      // Call the callback with the uploaded file
      if (onThumbnailUpload) {
        onThumbnailUpload(file);
      }
    }
  };

  if (!isOpen) return null;

  // Component to render in the portal
  const modalContent = (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999] p-4 pointer-events-auto modal-backdrop"
      style={{
        isolation: "isolate",
        backdropFilter: "blur(2px)",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      onClick={(e) => {
        // Close when clicking on the backdrop, not the modal content
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-background rounded-lg shadow-lg w-full max-w-xs sm:max-w-lg md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-auto relative z-[99999]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium">Select Video Thumbnail</h3>
          <p className="text-sm text-muted-foreground">
            Drag the slider to find the perfect frame, or upload a custom image
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Main content wrapper with responsive layout */}
          <div className="flex flex-col md:flex-row md:gap-4">
            {/* Video preview - full width on mobile, half width on desktop */}
            <div className="relative aspect-video bg-black/90 rounded-md overflow-hidden md:w-1/2 mb-4 md:mb-0">
              <video
                ref={videoRef}
                src={blobUrl}
                className="w-full h-full object-contain"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onClick={togglePlay}
                playsInline
                crossOrigin="anonymous"
              />
              {!blobUrl && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Thumbnail preview - full width on mobile, half width on desktop */}
            <div className="md:w-1/2">
              {thumbnailUrl ? (
                <div className="border rounded-md p-2 h-full">
                  <p className="text-sm font-medium mb-2">
                    Selected Thumbnail:
                  </p>
                  <div className="aspect-video bg-black/90 rounded-md overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbnailUrl}
                      alt="Selected thumbnail"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="border border-dashed rounded-md p-4 h-full flex items-center justify-center bg-muted/20">
                  <p className="text-sm text-muted-foreground text-center">
                    Capture a frame or upload a custom image to see the
                    thumbnail preview
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Time slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSliderChange}
              onValueCommit={() => setIsScrubbing(false)}
              disabled={duration === 0}
              aria-label="Seek video"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 md:flex-row">
            <Button
              onClick={captureThumbnail}
              disabled={!blobUrl || isCapturing}
              className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 flex-1 md:flex-none"
            >
              {isCapturing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              Capture Current Frame
            </Button>

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-white/90 text-foreground hover:bg-white flex-1 md:flex-none"
            >
              <Upload className="h-4 w-4" />
              Upload Custom Thumbnail
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Footer with action buttons */}
        <div className="p-4 border-t flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-white/90 text-foreground hover:bg-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDone}
            disabled={!thumbnailUrl}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Done
          </Button>
        </div>

        {/* Hidden canvas for capturing frames */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );

  // Check if we're in a browser environment before using createPortal
  const isBrowser = typeof window !== "undefined";

  // Use createPortal only in the browser, with a fallback for SSR
  return isBrowser ? createPortal(modalContent, document.body) : modalContent;
}
