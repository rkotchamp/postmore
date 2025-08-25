"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Download,
  Share2,
  X,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Play, User } from "lucide-react";

export default function ClipCard({
  clip,
  isSelected = false,
  selectMode = false,
  onClipSelect,
  onDownload,
  onShare,
  onRemove,
  aspectRatio = "video", // "video" (16:9) or "vertical" (9:16)
  // NEW: Template-related props (optional - won't break existing usage)
  appliedTemplate = null,
  appliedSettings = null,
  isTemplateApplied = false
}) {

  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);

  // Memoized template preferences mapping
  const templatePreferences = useMemo(() => ({
    'social-profile': 'horizontal',  // Sonnet prefers horizontal (2.35:1)
    'title-only': 'horizontal',      // Focus prefers horizontal (2.35:1)  
    'default': 'vertical',           // Blank prefers vertical (9:16)
    'bw-frame': 'vertical'           // B&W prefers vertical (9:16)
  }), []);

  // Memoized CSS filter for B&W template
  const getVideoFilter = useMemo(() => {
    if (isTemplateApplied && appliedTemplate === 'bw-frame') {
      // Dynamic B&W effect based on user settings
      const grayscaleLevel = appliedSettings?.bwLevel || 50;
      const contrast = (appliedSettings?.bwContrast || 130) / 100; // Convert percentage to decimal
      const brightness = (appliedSettings?.bwBrightness || 80) / 100; // Convert percentage to decimal
      
      return `grayscale(${grayscaleLevel}%) contrast(${contrast}) brightness(${brightness})`;
    }
    return 'none';
  }, [isTemplateApplied, appliedTemplate, appliedSettings?.bwLevel, appliedSettings?.bwContrast, appliedSettings?.bwBrightness]);

  // Memoized video URL selection based on applied template
  const videoUrl = useMemo(() => {
    if (!isTemplateApplied || !appliedTemplate) {
      // No template applied, use default video
      return clip.videoUrl || clip.url;
    }
    
    const preferredOrientation = templatePreferences[appliedTemplate] || 'vertical';
    
    // Debug logging
    console.log(`🎯 [VIDEO-SWAP] Template: ${appliedTemplate}, Prefers: ${preferredOrientation}`);
    console.log(`📹 [VIDEO-SWAP] Available videos:`, {
      hasHorizontal: !!clip.horizontalVideoUrl,
      hasVertical: !!clip.verticalVideoUrl,
      horizontal: clip.horizontalVideoUrl,
      vertical: clip.verticalVideoUrl,
      default: clip.videoUrl
    });
    
    // Get the appropriate video URL from clip properties
    if (preferredOrientation === 'horizontal' && clip.horizontalVideoUrl) {
      console.log(`✅ [VIDEO-SWAP] Using horizontal video (2.35:1) for ${appliedTemplate}`);
      return clip.horizontalVideoUrl;
    } else if (preferredOrientation === 'vertical' && clip.verticalVideoUrl) {
      console.log(`✅ [VIDEO-SWAP] Using vertical video (9:16) for ${appliedTemplate}`);
      return clip.verticalVideoUrl;
    }
    
    // Fallback to default URL
    console.log(`⚠️ [VIDEO-SWAP] Falling back to default URL`);
    return clip.videoUrl || clip.url;
  }, [isTemplateApplied, appliedTemplate, clip.videoUrl, clip.url, clip.horizontalVideoUrl, clip.verticalVideoUrl, templatePreferences]);

  const handleClipClick = useCallback(() => {
    if (onClipSelect) {
      onClipSelect(clip.id);
    }
  }, [onClipSelect, clip.id]);

  const handlePlayClick = useCallback((e) => {
    e.stopPropagation();
    setIsPlaying(true);
  }, []);


  const handleDownload = useCallback(async (e) => {
    e.stopPropagation();
    if (onDownload && videoUrl) {
      onDownload(clip);
    } else if (videoUrl) {
      try {
        // Use our API proxy to download video (bypasses CORS)
        const filename = `${clip.title || `clip_${clip.startTime}s`}.mp4`;
        
        const response = await fetch('/api/download-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoUrl: videoUrl,
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
        window.open(videoUrl, '_blank');
      }
    }
  }, [onDownload, videoUrl, clip]);

  const handleShare = useCallback((e) => {
    e.stopPropagation();
    if (onShare) {
      onShare(clip);
    }
  }, [onShare, clip]);

  const handleRemove = useCallback((e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(clip.id);
    }
  }, [onRemove, clip.id]);

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
        {videoUrl ? (
          <div className="relative w-full h-full overflow-hidden">
            {/* Conditional styling based on applied template */}
            {isTemplateApplied && appliedTemplate && templatePreferences[appliedTemplate] === 'horizontal' ? (
              /* Horizontal templates (Sonnet, Focus): Black bars + centered horizontal video */
              <>
                {/* Black background fills entire container */}
                <div className="absolute inset-0 bg-black" />
                
                {/* Centered horizontal video */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {!isPlaying && clip.thumbnail ? (
                    <img
                      src={clip.thumbnail}
                      alt="Video thumbnail"
                      className="max-w-full max-h-full object-contain transition-opacity duration-300"
                      onLoad={() => {
                        setVideoLoaded(true);
                        setIsVideoLoading(false);
                      }}
                      onError={() => setVideoError(true)}
                      style={{ 
                        backgroundColor: '#000',
                        filter: getVideoFilter
                      }}
                    />
                  ) : !isPlaying ? (
                    <video
                      className="max-w-full max-h-full object-contain"
                      preload="metadata"
                      muted
                      playsInline
                      style={{ 
                        backgroundColor: '#000',
                        filter: getVideoFilter
                      }}
                      onLoadedMetadata={() => {
                        setVideoLoaded(true);
                        setIsVideoLoading(false);
                      }}
                      onError={() => setVideoError(true)}
                    >
                      <source src={videoUrl} type="video/mp4" />
                    </video>
                  ) : (
                    <video
                      className="max-w-full max-h-full object-contain transition-opacity duration-300"
                      controls
                      playsInline
                      autoPlay
                      preload="metadata"
                      style={{ 
                        backgroundColor: '#000',
                        filter: getVideoFilter
                      }}
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
                      <source src={videoUrl} type="video/mp4" />
                    </video>
                  )}
                </div>
              </>
            ) : (
              /* Vertical templates and default: Full frame video */
              <>
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
                      style={{ 
                        backgroundColor: '#000',
                        filter: getVideoFilter
                      }}
                    />
                  </div>
                ) : !isPlaying ? (
                  <div className="w-full h-full relative">
                    <video
                      className="w-full h-full object-cover"
                      preload="metadata"
                      muted
                      playsInline
                      style={{ 
                        backgroundColor: '#000',
                        filter: getVideoFilter
                      }}
                      onLoadedMetadata={() => {
                        setVideoLoaded(true);
                        setIsVideoLoading(false);
                      }}
                      onError={() => setVideoError(true)}
                    >
                      <source src={videoUrl} type="video/mp4" />
                    </video>
                  </div>
                ) : (
                  <video
                    className="w-full h-full object-cover transition-opacity duration-300"
                    controls
                    playsInline
                    autoPlay
                    preload="metadata"
                    style={{ 
                      backgroundColor: '#000',
                      filter: getVideoFilter
                    }}
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
                    <source src={videoUrl} type="video/mp4" />
                  </video>
                )}
              </>
            )}
            
            {/* Template Overlay - Show when template is applied */}
            {isTemplateApplied && appliedTemplate && appliedSettings && (
              <div className="absolute inset-0 pointer-events-none">
                {appliedTemplate === 'social-profile' && (
                  <div 
                    className="absolute top-0 left-0 right-0 h-[30%] p-2"
                    style={{ 
                      backgroundColor: `${appliedSettings.overlayColor || '#000000'}${Math.round((appliedSettings.overlayOpacity || 80) * 2.55).toString(16).padStart(2, '0')}`,
                      color: appliedSettings.textColor || '#ffffff'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center overflow-hidden">
                        {appliedSettings.profilePic ? (
                          <img src={appliedSettings.profilePic} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-0.5">
                          <span className="text-[10px] font-semibold">{appliedSettings.username || 'YourUsername'}</span>
                          <svg className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                        </div>
                        <div className="text-[9px] opacity-80 -mt-0.5">@{(appliedSettings.username || 'username').toLowerCase()}</div>
                      </div>
                    </div>
                    <div className="text-xs mt-1 line-clamp-2">{appliedSettings.customHeader || 'Your header text'}</div>
                  </div>
                )}
                
                {appliedTemplate === 'title-only' && (
                  <div 
                    className="absolute top-0 left-0 right-0 h-[25%] flex items-center justify-center p-2"
                    style={{ 
                      backgroundColor: `${appliedSettings.overlayColor || '#000000'}${Math.round((appliedSettings.overlayOpacity || 80) * 2.55).toString(16).padStart(2, '0')}`,
                      color: appliedSettings.textColor || '#ffffff'
                    }}
                  >
                    <div className="text-xs font-bold text-center line-clamp-2">
                      {appliedSettings.customHeader || 'Your title text'}
                    </div>
                  </div>
                )}
                
                {/* Bottom overlay for letterbox effect */}
                {(appliedTemplate === 'social-profile' || appliedTemplate === 'title-only') && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-[15%]"
                    style={{ 
                      backgroundColor: `${appliedSettings.overlayColor || '#000000'}${Math.round((appliedSettings.overlayOpacity || 80) * 2.55).toString(16).padStart(2, '0')}`
                    }}
                  />
                )}
              </div>
            )}
            
            {/* Large Centered Play Button - Only on hover and when not playing */}
            {videoUrl && !videoError && videoLoaded && !isVideoLoading && showControls && !isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-all duration-300">
                <button 
                  className="w-20 h-20 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-200 shadow-xl"
                  onClick={handlePlayClick}
                >
                  <Play className="w-10 h-10 text-black ml-1" />
                </button>
              </div>
            )}
          </div>
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