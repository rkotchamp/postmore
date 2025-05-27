"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Play, AlertCircle } from "lucide-react";
import Video from "next-video";

/**
 * Helper function to get MIME type from URL or filename
 */
const getVideoMimeType = (url) => {
  if (!url) return "video/mp4"; // Default fallback

  const extension = url.split(".").pop().split("?")[0].toLowerCase();
  switch (extension) {
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "ogg":
      return "video/ogg";
    case "mov":
      return "video/quicktime";
    case "avi":
      return "video/x-msvideo";
    case "wmv":
      return "video/x-ms-wmv";
    case "flv":
      return "video/x-flv";
    case "mkv":
      return "video/x-matroska";
    default:
      return "video/mp4"; // Default fallback
  }
};

/**
 * VideoPreview component for displaying video content in posts
 *
 * @param {Object} props
 * @param {string} props.videoUrl - The URL of the video to play
 * @param {string} props.thumbnailUrl - URL of the thumbnail image to display before play
 * @param {string} props.id - Unique identifier for the video
 */
export const VideoPreview = ({ videoUrl, thumbnailUrl, id }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);

  // If the video URL is invalid, show an error
  if (!videoUrl) {
    return (
      <div className="w-full h-full bg-gray-800 rounded-t-lg flex items-center justify-center">
        <div className="bg-black/70 px-3 py-2 rounded-md flex items-center">
          <AlertCircle className="h-4 w-4 text-red-400 mr-1.5" />
          <p className="text-white text-xs">No video source provided</p>
        </div>
      </div>
    );
  }

  // Handle click on the play button or thumbnail
  const handlePlayClick = () => {
    setIsPlaying(true);
    setError(null);
  };

  // If we have a thumbnail and not playing yet, show thumbnail with play button
  if (thumbnailUrl && (!isPlaying || error)) {
    return (
      <div className="w-full h-full relative">
        {/* Background with thumbnail */}
        <div className="w-full h-full rounded-t-lg overflow-hidden">
          <Image
            src={thumbnailUrl}
            alt="Video thumbnail"
            fill
            className="object-cover rounded-t-lg"
          />
        </div>

        {/* Play button overlay */}
        <div
          className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center cursor-pointer rounded-t-lg"
          onClick={handlePlayClick}
          onKeyDown={(e) => e.key === "Enter" && handlePlayClick()}
          tabIndex={0}
          aria-label="Play video"
        >
          {error ? (
            <>
              <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg mb-3">
                <Play className="h-8 w-8 text-purple-600 fill-current ml-1" />
              </div>
              <div className="bg-black/70 px-4 py-2 rounded-md flex items-center">
                <AlertCircle className="h-4 w-4 text-yellow-400 mr-2" />
                <p className="text-white text-sm">{error} (tap to retry)</p>
              </div>
            </>
          ) : (
            <div className="h-20 w-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
              <Play className="h-10 w-10 text-purple-600 fill-current ml-1.5" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // No thumbnail or already playing - show video directly
  // We'll use the native video element for simplicity and to avoid CORS issues
  return (
    <div className="w-full h-full relative">
      <video
        ref={videoRef}
        className="w-full h-full object-contain rounded-t-lg bg-black"
        controls
        playsInline
        autoPlay={isPlaying}
        preload="metadata"
        id={`video-${id}`}
        onError={(e) => {
          console.error("Video error:", e.target.error || e);
          setError("Unable to load this video");
          setIsPlaying(false);
        }}
      >
        <source src={videoUrl} type={getVideoMimeType(videoUrl)} />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPreview;
