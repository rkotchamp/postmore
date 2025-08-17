"use client";

import { useState, useRef } from "react";
import {
  Play,
  Download,
  Share2,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Checkbox } from "@/app/components/ui/checkbox";

export default function ClipCard({
  clip,
  isSelected = false,
  selectMode = false,
  onClipSelect,
  onDownload,
  onShare,
  onRemove,
  aspectRatio = "video" // "video" (16:9) or "vertical" (9:16)
}) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  const handleClipClick = () => {
    if (onClipSelect) {
      onClipSelect(clip.id);
    }
  };

  const togglePlayback = async (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      try {
        if (isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
        } else {
          await videoRef.current.play();
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('❌ [VIDEO] Playback failed:', error);
        setIsPlaying(false);
      }
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
  };

  const handleVideoError = (e) => {
    console.error('🚫 [VIDEO] Error loading video:', e.target.error);
    console.error('🔗 [VIDEO] Video URL:', clip.videoUrl);
    setIsVideoLoading(false);
    setVideoError(true);
    setIsPlaying(false);
  };

  const handleVideoLoaded = () => {
    console.log('✅ [VIDEO] Video loaded successfully:', clip.videoUrl);
    setIsVideoLoading(false);
    setVideoLoaded(true);
    setVideoError(false);
  };

  const handleVideoLoadStart = () => {
    console.log('🔄 [VIDEO] Loading video:', clip.videoUrl);
    setIsVideoLoading(true);
    setVideoLoaded(false);
    setVideoError(false);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    if (onDownload && clip.videoUrl) {
      onDownload(clip);
    } else if (clip.videoUrl) {
      // Default download behavior
      const link = document.createElement('a');
      link.href = clip.videoUrl;
      link.download = `${clip.title}.mp4`;
      link.click();
    }
  };

  const handleShare = (e) => {
    e.stopPropagation();
    if (onShare) {
      onShare(clip);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(clip.id);
    }
  };

  // Dynamic classes based on aspect ratio - make vertical videos taller
  const aspectClass = aspectRatio === "vertical" ? "aspect-[9/16]" : "aspect-video";
  const cardClasses = aspectRatio === "vertical" 
    ? "w-full max-w-[220px]" // Slightly wider for better visibility
    : "w-full";

  return (
    <Card
      className={`${cardClasses} bg-card/80 backdrop-blur-sm border-border overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={handleClipClick}
    >
      {/* Video Preview */}
      <div 
        className={`relative ${aspectClass} bg-gray-900 rounded-lg overflow-hidden`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {clip.videoUrl ? (
          videoError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-gray-400">
              <div className="text-center">
                <div className="text-red-400 mb-2">⚠️</div>
                <span className="text-xs">Video unavailable</span>
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (clip.videoUrl) {
                        window.open(clip.videoUrl, '_blank');
                      }
                    }}
                    className="text-xs px-2 py-1"
                  >
                    Open in new tab
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={clip.videoUrl}
              className="w-full h-full object-cover"
              preload="metadata"
              muted
              loop
              playsInline
              controls={false}
              onLoadStart={handleVideoLoadStart}
              onLoadedData={handleVideoLoaded}
              onError={handleVideoError}
              onEnded={handleVideoEnd}
              onLoadedMetadata={() => {
                console.log('📹 [VIDEO] Metadata loaded for:', clip.title);
                setIsVideoLoading(false);
                setVideoLoaded(true);
              }}
              style={{ backgroundColor: '#000' }}
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
            <span className="text-sm">Processing...</span>
          </div>
        )}

        {/* Loading Overlay */}
        {clip.videoUrl && isVideoLoading && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex flex-col items-center text-white">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <span className="text-xs">Loading video...</span>
            </div>
          </div>
        )}

        {/* Duration Badge */}
        <div className={`absolute top-2 right-2 bg-black/80 text-white px-1.5 py-0.5 rounded font-medium leading-tight ${
          aspectRatio === "vertical" ? "text-[10px]" : "text-xs"
        }`}>
          {clip.startTime}s - {clip.endTime}s
        </div>

        {/* Pro Badge */}
        {clip.isPro && (
          <Badge className={`absolute top-2 left-2 bg-white text-black font-medium ${
            aspectRatio === "vertical" ? "text-[10px] px-1.5 py-0.5" : "text-xs"
          }`}>
            Pro
          </Badge>
        )}

        {/* Play/Pause Button */}
        {clip.videoUrl && !videoError && videoLoaded && !isVideoLoading && (showControls || !isPlaying) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-200">
            <button
              onClick={togglePlayback}
              className={`rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors ${
                aspectRatio === "vertical" ? "w-12 h-12" : "w-14 h-14"
              }`}
            >
              {isPlaying ? (
                <div className={`bg-white ${
                  aspectRatio === "vertical" ? "w-1 h-5" : "w-1.5 h-6"
                } mr-1`}></div>
              ) : (
                <Play className={`text-white ${
                  aspectRatio === "vertical" ? "w-5 h-5 ml-0.5" : "w-6 h-6 ml-1"
                }`} />
              )}
              {isPlaying && (
                <div className={`bg-white ${
                  aspectRatio === "vertical" ? "w-1 h-5" : "w-1.5 h-6"
                }`}></div>
              )}
            </button>
          </div>
        )}

        {/* Selection Checkbox */}
        {selectMode && (
          <div className={`absolute ${aspectRatio === "vertical" ? "bottom-2" : "top-2"} left-2`}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => handleClipClick()}
              className="bg-white border-white w-4 h-4"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className={aspectRatio === "vertical" ? "p-3" : "p-4"}>
        <h3 className={`font-medium text-foreground line-clamp-2 leading-tight ${
          aspectRatio === "vertical" ? "text-xs mb-2" : "text-sm mb-3"
        }`}>
          {clip.title}
        </h3>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${aspectRatio === "vertical" ? "gap-1" : "gap-2"}`}>
            <Button
              variant="outline"
              size="sm"
              className={`p-0 border-border hover:bg-muted/50 bg-transparent ${
                aspectRatio === "vertical" ? "h-6 w-6" : "h-8 w-8"
              }`}
              onClick={handleDownload}
            >
              <Download className={aspectRatio === "vertical" ? "w-3 h-3" : "w-4 h-4"} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`p-0 border-border hover:bg-muted/50 bg-transparent ${
                aspectRatio === "vertical" ? "h-6 w-6" : "h-8 w-8"
              }`}
              onClick={handleShare}
            >
              <Share2 className={aspectRatio === "vertical" ? "w-3 h-3" : "w-4 h-4"} />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className={`p-0 border-border hover:bg-muted/50 hover:text-destructive bg-transparent ${
              aspectRatio === "vertical" ? "h-6 w-6" : "h-8 w-8"
            }`}
            onClick={handleRemove}
          >
            <X className={aspectRatio === "vertical" ? "w-3 h-3" : "w-4 h-4"} />
          </Button>
        </div>
      </div>
    </Card>
  );
}