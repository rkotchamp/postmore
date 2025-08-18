"use client";

import { useState, useRef } from "react";
import {
  Download,
  Share2,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Play } from "lucide-react";

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

  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);

  const handleClipClick = () => {
    if (onClipSelect) {
      onClipSelect(clip.id);
    }
  };

  const handlePlayClick = (e) => {
    e.stopPropagation();
    setIsPlaying(true);
  };


  const handleDownload = async (e) => {
    e.stopPropagation();
    if (onDownload && clip.videoUrl) {
      onDownload(clip);
    } else if (clip.videoUrl) {
      try {
        // Use our API proxy to download video (bypasses CORS)
        const filename = `${clip.title || `clip_${clip.startTime}s`}.mp4`;
        
        const response = await fetch('/api/download-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoUrl: clip.videoUrl,
            filename: filename
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Download failed: ${response.statusText}`);
        }
        
        // Get the blob from the response
        const blob = await response.blob();
        
        // Create blob URL and trigger download
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        URL.revokeObjectURL(blobUrl);
        
      } catch (error) {
        console.error('Download failed:', error);
        // Fallback to opening in new tab
        window.open(clip.videoUrl, '_blank');
      }
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

  // Dynamic classes - much larger and more breathing space like reference
  const aspectClass = aspectRatio === "vertical" ? "aspect-[9/16]" : "aspect-video";
  const cardClasses = aspectRatio === "vertical" 
    ? "w-full max-w-[400px]" // Even wider main card for better presence
    : "w-full max-w-[560px]";

  return (
    <Card
      className={`${cardClasses} bg-transparent border border-transparent hover:border-border/50 hover:bg-card/80 hover:shadow-xl backdrop-blur-sm overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] px-4 py-4 rounded-2xl ${
        isSelected ? "ring-2 ring-primary bg-card/50" : ""
      }`}
      onClick={handleClipClick}
    >
      {/* Video Preview Section - Main focus like reference */}
      <div 
        className={`relative ${aspectClass} bg-gray-900 rounded-xl overflow-hidden mb-3 shadow-lg`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {clip.videoUrl ? (
          <>
            {/* Show thumbnail if available, otherwise show video with poster */}
            {!isPlaying && clip.thumbnail ? (
              <div className="w-full h-full relative">
                <img
                  src={clip.thumbnail}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover transition-opacity duration-300"
                  onLoad={() => {
                    setVideoLoaded(true);
                    setIsVideoLoading(false);
                  }}
                  onError={() => setVideoError(true)}
                  style={{ backgroundColor: '#000' }} // Prevent white flash
                />
              </div>
            ) : !isPlaying ? (
              /* Show video with poster when no thumbnail */
              <div className="w-full h-full relative">
                <video
                  className="w-full h-full object-cover"
                  preload="metadata"
                  muted
                  playsInline
                  style={{ backgroundColor: '#000' }}
                  onLoadedMetadata={() => {
                    setVideoLoaded(true);
                    setIsVideoLoading(false);
                  }}
                  onError={() => setVideoError(true)}
                >
                  <source src={clip.videoUrl} type="video/mp4" />
                </video>
              </div>
            ) : null}
            
            {/* Video element - only render when playing */}
            {isPlaying && (
              <video
                className="w-full h-full object-cover transition-opacity duration-300"
                controls
                playsInline
                autoPlay
                preload="metadata"
                style={{ backgroundColor: '#000' }}
                onError={() => {
                  setVideoError(true);
                  setIsPlaying(false);
                }}
                onLoadStart={() => setIsVideoLoading(true)}
                onLoadedData={() => {
                  setIsVideoLoading(false);
                  setVideoLoaded(true);
                }}
              >
                <source src={clip.videoUrl} type="video/mp4" />
              </video>
            )}
            
            {/* Large Centered Play Button - Only on hover and when not playing */}
            {clip.videoUrl && !videoError && videoLoaded && !isVideoLoading && showControls && !isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-all duration-300">
                <button 
                  className="w-20 h-20 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-200 shadow-xl"
                  onClick={handlePlayClick}
                >
                  <Play className="w-10 h-10 text-black ml-1" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900">
            {/* Bokeh gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-800/20 to-pink-900/20" />
            
            {/* Animated bokeh circles */}
            <div className="absolute top-1/4 left-1/4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl animate-pulse" />
            <div className="absolute top-3/4 right-1/4 w-16 h-16 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-300" />
            <div className="absolute bottom-1/4 left-1/3 w-12 h-12 bg-pink-500/10 rounded-full blur-xl animate-pulse delay-700" />
            
            {/* Laser-like scanning light */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent animate-scan-vertical" />
            </div>
            
            {/* Processing text with subtle animation */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/40 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
                <span className="text-sm text-gray-300 animate-pulse">Processing...</span>
              </div>
            </div>
          </div>
        )}

        {/* Duration Badge - Always visible like reference */}
        <div className={`absolute top-3 right-3 bg-black/80 text-white px-2 py-1 rounded-md font-medium backdrop-blur-sm ${
          aspectRatio === "vertical" ? "text-xs" : "text-sm"
        }`}>
          {clip.duration ? `${clip.duration}s` : `${clip.endTime - clip.startTime}s`}
        </div>

        {/* Pro Badge */}
        {clip.isPro && (
          <Badge className={`absolute top-3 left-3 bg-white text-black font-semibold shadow-sm ${
            aspectRatio === "vertical" ? "text-xs px-2 py-1" : "text-sm px-3 py-1"
          }`}>
            Pro
          </Badge>
        )}

        {/* Selection Checkbox */}
        {selectMode && (
          <div className={`absolute ${aspectRatio === "vertical" ? "bottom-3" : "top-3"} left-3`}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => handleClipClick()}
              className="bg-white border-white w-5 h-5 shadow-sm"
            />
          </div>
        )}
      </div>

      {/* Content Section - More breathing space */}
      <div className="px-2">
        <h3 className={`font-semibold text-foreground line-clamp-2 leading-relaxed mb-3 ${
          aspectRatio === "vertical" ? "text-sm" : "text-base"
        }`}>
          {clip.title}
        </h3>

        {/* Action Buttons - Cleaner spacing */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${aspectRatio === "vertical" ? "gap-2" : "gap-3"}`}>
            <Button
              variant="outline"
              size="sm"
              className={`border-border hover:bg-muted/50 bg-transparent transition-all duration-200 ${
                aspectRatio === "vertical" ? "h-8 w-8 p-0" : "h-9 w-9 p-0"
              }`}
              onClick={handleDownload}
            >
              <Download className={aspectRatio === "vertical" ? "w-4 h-4" : "w-4 h-4"} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`border-border hover:bg-muted/50 bg-transparent transition-all duration-200 ${
                aspectRatio === "vertical" ? "h-8 w-8 p-0" : "h-9 w-9 p-0"
              }`}
              onClick={handleShare}
            >
              <Share2 className={aspectRatio === "vertical" ? "w-4 h-4" : "w-4 h-4"} />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className={`border-border hover:bg-muted/50 hover:text-destructive bg-transparent transition-all duration-200 ${
              aspectRatio === "vertical" ? "h-8 w-8 p-0" : "h-9 w-9 p-0"
            }`}
            onClick={handleRemove}
          >
            <X className={aspectRatio === "vertical" ? "w-4 h-4" : "w-4 h-4"} />
          </Button>
        </div>
      </div>
    </Card>
  );
}