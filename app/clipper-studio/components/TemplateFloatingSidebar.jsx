"use client";

import { useState, useEffect, useRef, memo, useMemo, useCallback } from "react";
import {
  Palette,
  User,
  ChevronRight,
  Image,
  Upload,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Sidebar } from "@/app/components/ui/sidebar";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/app/components/ui/tooltip";
import { useTemplateStore } from "@/app/lib/store/templateStore";
import { useClipsQuery, useBestPreviewVideo } from "@/app/hooks/useClipsQuery";
import { TemplateCardsSkeletonGrid } from "./TemplateCardSkeleton";

// Template Card Component with Video Preview - Memoized to prevent unnecessary re-renders
const TemplateCard = memo(function TemplateCard({ template, isSelected, onSelect, className, bestPreviewVideo, overlaySettings }) {
  const [showVideo, setShowVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  // Select appropriate video format based on template type
  const getVideoUrlForTemplate = (templateId, clipData) => {
    if (!clipData) return null;


    // Templates with top overlays PREFER horizontal video (16:9)
    if (templateId === 'social-profile' || templateId === 'title-only') {
      const selectedUrl = clipData.horizontalVideoUrl || 
                          clipData.previewVideo?.url || 
                          clipData.videoUrl;
      return selectedUrl;
    }
    
    // Templates without overlays PREFER vertical video (9:16) 
    if (templateId === 'bw-frame' || templateId === 'default') {
      const selectedUrl = clipData.verticalVideoUrl || 
                          clipData.previewVideo?.url || 
                          clipData.videoUrl;
      return selectedUrl;
    }
    
    // Fallback - try any available video
    const selectedUrl = clipData.previewVideo?.url || 
                        clipData.verticalVideoUrl || 
                        clipData.horizontalVideoUrl || 
                        clipData.videoUrl;
    return selectedUrl;
  };

  const previewVideoUrl = getVideoUrlForTemplate(template.id, bestPreviewVideo);
  

  // Auto-play video on hover for better UX
  const handleMouseEnter = () => {
    setShowVideo(true);
    if (videoRef.current && previewVideoUrl) {
      // Wait for video to be ready before attempting to play
      const attemptPlay = () => {
        if (videoRef.current && videoRef.current.readyState >= 2) { // HAVE_CURRENT_DATA or higher
          videoRef.current.play().catch(() => {
            // Don't set videoError for play failures - video is still valid for display
          });
        } else if (videoRef.current) {
          // Video not ready yet, wait for loadeddata event
          videoRef.current.addEventListener('loadeddata', attemptPlay, { once: true });
        }
      };
      
      attemptPlay();
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  return (
    <div
      className={cn(
        "relative p-4 border rounded-lg cursor-pointer transition-all duration-200 group",
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50 hover:bg-muted/50',
        className
      )}
      onClick={() => onSelect(template.id)}
    >
      {/* Template Preview - 1-minute video with overlay */}
      <div 
        className="aspect-[9/16] w-full mb-3 rounded-md overflow-hidden bg-muted relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {previewVideoUrl && !videoError ? (
          <div className="relative w-full h-full overflow-hidden">
            {/* For Sonnet and Focus templates: Black bars + centered horizontal video */}
            {(template.id === 'social-profile' || template.id === 'title-only') ? (
              <>
                {/* Black background fills entire container */}
                <div className="absolute inset-0 bg-black" />
                
                {/* Centered horizontal video */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <video
                    key={`${template.id}-${previewVideoUrl}`}
                    ref={videoRef}
                    className="max-w-full max-h-full object-contain"
                    muted
                    loop
                    playsInline
                    style={{ 
                      filter: template.id === 'bw-frame' ? 
                        (() => {
                          const grayscaleLevel = overlaySettings?.bwLevel || 50;
                          const contrast = (overlaySettings?.bwContrast || 130) / 100;
                          const brightness = (overlaySettings?.bwBrightness || 80) / 100;
                          return `grayscale(${grayscaleLevel}%) contrast(${contrast}) brightness(${brightness})`;
                        })() : 'none'
                    }}
                    onError={(e) => {
                      const errorDetails = {
                        url: previewVideoUrl,
                        errorType: e.type,
                        templateId: template.id,
                        networkState: e.target.networkState,
                        readyState: e.target.readyState,
                        error: e.target.error ? {
                          code: e.target.error.code,
                          message: e.target.error.message
                        } : null
                      };
                          setVideoError(true);
                    }}
                    onLoadedData={() => {
                      setVideoError(false); // Reset error state when video loads successfully
                    }}
                  >
                    <source src={previewVideoUrl} type="video/mp4" />
                  </video>
                </div>
              </>
            ) : (
              /* For other templates: Full frame vertical video */
              <video
                key={`${template.id}-${previewVideoUrl}`}
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                style={{ 
                  filter: template.id === 'bw-frame' ? 
                    (() => {
                      const grayscaleLevel = overlaySettings?.bwLevel || 50;
                      const contrast = (overlaySettings?.bwContrast || 130) / 100;
                      const brightness = (overlaySettings?.bwBrightness || 80) / 100;
                      return `grayscale(${grayscaleLevel}%) contrast(${contrast}) brightness(${brightness})`;
                    })() : 'none'
                }}
                onError={(e) => {
                  const errorDetails = {
                    url: previewVideoUrl,
                    errorType: e.type,
                    templateId: template.id,
                    networkState: e.target.networkState,
                    readyState: e.target.readyState,
                    error: e.target.error ? {
                      code: e.target.error.code,
                      message: e.target.error.message
                    } : null
                  };
                  setVideoError(true);
                }}
                onLoadedData={() => {
                  setVideoError(false); // Reset error state when video loads successfully
                }}
              >
                <source src={previewVideoUrl} type="video/mp4" />
              </video>
            )}
            
            {/* Template overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {template.id === 'social-profile' && (
                <div 
                  className="absolute top-0 left-0 right-0 h-[30%] p-2"
                  style={{ 
                    backgroundColor: `${overlaySettings?.overlayColor || '#000000'}${Math.round((overlaySettings?.overlayOpacity || 80) * 2.55).toString(16).padStart(2, '0')}`,
                    color: overlaySettings?.textColor || '#ffffff'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center overflow-hidden">
                      {overlaySettings?.profilePic ? (
                        <img src={overlaySettings.profilePic} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-0.5">
                        <span className="text-[10px] font-semibold">{overlaySettings?.username || 'YourUsername'}</span>
                        {/* Verified Badge - Same as Twitter design */}
                        <svg className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                      <div className="text-[9px] opacity-80 -mt-0.5">@{(overlaySettings?.username || 'username').toLowerCase()}</div>
                    </div>
                  </div>
                  <div className="text-xs mt-1 line-clamp-2">{overlaySettings?.customHeader || 'Your header text'}</div>
                </div>
              )}
              
              {template.id === 'title-only' && (
                <div 
                  className="absolute top-0 left-0 right-0 h-[25%] flex items-center justify-center p-2"
                  style={{ 
                    backgroundColor: `${overlaySettings?.overlayColor || '#000000'}${Math.round((overlaySettings?.overlayOpacity || 80) * 2.55).toString(16).padStart(2, '0')}`,
                    color: overlaySettings?.textColor || '#ffffff'
                  }}
                >
                  <div className="text-xs font-bold text-center line-clamp-2">
                    {overlaySettings?.customHeader || 'Your title text'}
                  </div>
                </div>
              )}
              
              {/* Bottom overlay for Sonnet and Focus to complete the letterbox effect */}
              {(template.id === 'social-profile' || template.id === 'title-only') && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-[15%]"
                  style={{ 
                    backgroundColor: `${overlaySettings?.overlayColor || '#000000'}${Math.round((overlaySettings?.overlayOpacity || 80) * 2.55).toString(16).padStart(2, '0')}`
                  }}
                />
              )}
              
              {template.id === 'bw-frame' && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  {overlaySettings?.customImage ? (
                    <img src={overlaySettings.customImage} alt="Logo" className="h-12 max-w-40 object-contain" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-500/30 flex items-center justify-center">
                      <span className="text-white/80 text-[10px] font-semibold">logo</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
            <div className="text-center">
              <Palette className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-medium">{template.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Template Info */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground text-base">{template.name}</h3>
          {template.isDefault && (
            <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
              Default
            </span>
          )}
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      )}
    </div>
  );
});

const MOCK_TEMPLATES = [
  {
    id: 'default',
    name: 'Blank',
    category: 'basic',
    isDefault: true,
    config: {
      layout: 'fullframe',
      hasProfile: false,
      hasHeader: false,
    }
  },
  {
    id: 'social-profile',
    name: 'Sonnet',
    category: 'social',
    config: {
      layout: 'landscape-with-overlay',
      hasProfile: true,
      hasHeader: true,
      requiresUsername: true,
      requiresProfilePic: true,
    }
  },
  {
    id: 'title-only',
    name: 'Focus',
    category: 'text',
    config: {
      layout: 'landscape-with-overlay',
      hasProfile: false,
      hasHeader: true,
    }
  },
  {
    id: 'bw-frame',
    name: 'B&W',
    category: 'artistic',
    config: {
      layout: 'fullframe',
      filter: 'grayscale',
      hasLogo: true,
    }
  },
];

export default function TemplateFloatingSidebar({ 
  selectedClips = [],
  projectId, // Add projectId prop for TanStack Query
  onTemplateApply,
  isApplying = false 
}) {
  // Debug: Log component re-renders with timestamp
  
  // Use Zustand store - DON'T subscribe to customHeader to prevent re-renders during typing
  const {
    expanded, setExpanded,
    selectedTemplate, setSelectedTemplate,
    username, setUsername,
    profilePic, setProfilePic,
    // customHeader, setCustomHeader,  // REMOVED - don't subscribe to this
    setCustomHeader,  // Keep the setter but don't subscribe to the value
    customImage, setCustomImage,
    bwLevel, setBwLevel,
    bwContrast, setBwContrast,
    bwBrightness, setBwBrightness,
    overlayColor, setOverlayColor,
    overlayOpacity, setOverlayOpacity,
    textColor, setTextColor,
    selectedText, setSelectedText,
    selectedTextColor, setSelectedTextColor,
    showTextColorPicker, setShowTextColorPicker,
    previewCache, setPreviewCache,
    bestPreviewVideo, setBestPreviewVideo,
    clearPreviewCache,
    // NEW: Template application actions
    applyTemplateToGallery, isTemplateApplied
  } = useTemplateStore();
  
  // Get customHeader only when needed (for template apply) without subscribing to changes
  const getCustomHeader = useCallback(() => useTemplateStore.getState().customHeader, []);
  
  // Subscribe to customHeader changes only for template card updates (separate from input)
  const customHeaderForTemplates = useTemplateStore((state) => state.customHeader);
  
  // Use TanStack Query for clips data instead of props
  const { 
    data: clipsData, 
    isLoading: isLoadingClips
  } = useClipsQuery(projectId);
  
  // Extract clips from the query result
  const allClips = clipsData?.clips || [];
  
  // Get the best preview video for templates
  const bestPreviewVideoFromQuery = useBestPreviewVideo(allClips);
  
  // Debug: Log current textColor and clips loading state
  
  // Refs to manage contentEditable without triggering re-renders
  const headerRef = useRef(null);
  const titleRef = useRef(null);

  // Update the bestPreviewVideo in Zustand store when query data changes
  // Use a more stable update pattern to prevent unnecessary re-renders
  useEffect(() => {
    if (bestPreviewVideoFromQuery && (!bestPreviewVideo || bestPreviewVideoFromQuery.id !== bestPreviewVideo.id)) {
      setBestPreviewVideo(bestPreviewVideoFromQuery);
    }
  }, [bestPreviewVideoFromQuery?.id, bestPreviewVideo?.id, setBestPreviewVideo]);

  // Component lifecycle - only reset UI when projectId changes (different gallery)
  useEffect(() => {
    
    // Only reset sidebar expanded state (not video data)
    setExpanded(false);
    
    return () => {
      // Cleanup on unmount (when leaving clips gallery)
      setExpanded(false);
    };
  }, [projectId, setExpanded]); // Run when projectId changes

  // Check for screen size on mount and when window resizes
  useEffect(() => {
    const checkScreenSize = () => {
      // Close sidebar by default on small screens
      if (window.innerWidth < 1024) {
        setExpanded(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Clear preview cache when settings change to trigger regeneration
  // REMOVED customHeader from dependencies to prevent re-renders during typing
  useEffect(() => {
    clearPreviewCache();
  }, [overlayColor, overlayOpacity, textColor, username, profilePic, clearPreviewCache]);

  const toggleSidebar = () => {
    setExpanded(!expanded);
  };

  // Handle text selection and color change
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && selection.toString().length > 0) {
      setSelectedText(selection.toString());
      setShowTextColorPicker(true);
      return selection;
    } else {
      setSelectedText('');
      setShowTextColorPicker(false);
      return null;
    }
  };

  const applyColorToSelectedText = (color) => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && selection.toString().length > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.color = color;
      span.style.fontWeight = 'inherit';
      
      try {
        range.surroundContents(span);
      } catch (e) {
        // If range spans multiple elements, extract and wrap content
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
      }
      
      // Clear selection
      selection.removeAllRanges();
      setSelectedText('');
      setShowTextColorPicker(false);
    }
  };

  const handleTemplateSelect = useCallback((templateId) => {
    setSelectedTemplate(templateId);
  }, [setSelectedTemplate]);

  // Extract video frame for preview
  const extractVideoFrame = (videoUrl, timeSeconds = 5) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.currentTime = timeSeconds;
      
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        resolve(canvas);
      };
      
      video.onerror = () => resolve(null);
      video.src = videoUrl;
    });
  };

  // Draw Sonnet template overlay
  const drawSonnetOverlay = (ctx, width, height, settings) => {
    const { username, profilePic, customHeader, overlayColor, overlayOpacity, textColor } = settings;
    
    // Draw overlay background
    const alpha = overlayOpacity / 100;
    ctx.fillStyle = `${overlayColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
    ctx.fillRect(0, 0, width, height * 0.3); // Top 30% overlay
    
    // Draw profile circle
    const profileSize = width * 0.08;
    const profileX = width * 0.05;
    const profileY = height * 0.05;
    
    ctx.beginPath();
    ctx.arc(profileX + profileSize/2, profileY + profileSize/2, profileSize/2, 0, Math.PI * 2);
    ctx.fillStyle = '#666';
    ctx.fill();
    
    // Draw username
    ctx.fillStyle = textColor;
    ctx.font = `${width * 0.035}px Arial`;
    ctx.fillText(username || 'YourUsername', profileX + profileSize + 10, profileY + profileSize/2);
    
    // Draw header text
    ctx.font = `${width * 0.03}px Arial`;
    const lines = (customHeader || 'Your header text').match(/.{1,30}/g) || [];
    lines.forEach((line, i) => {
      ctx.fillText(line, width * 0.05, profileY + profileSize + 20 + (i * 20));
    });
  };

  // Draw Focus template overlay
  const drawFocusOverlay = (ctx, width, height, settings) => {
    const { customHeader, overlayColor, overlayOpacity, textColor } = settings;
    
    // Draw overlay background
    const alpha = overlayOpacity / 100;
    ctx.fillStyle = `${overlayColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
    ctx.fillRect(0, 0, width, height * 0.25); // Top 25% overlay
    
    // Draw centered title
    ctx.fillStyle = textColor;
    ctx.font = `bold ${width * 0.04}px Arial`;
    ctx.textAlign = 'center';
    
    const lines = (customHeader || 'Your title text').match(/.{1,20}/g) || [];
    lines.forEach((line, i) => {
      ctx.fillText(line, width/2, height * 0.08 + (i * width * 0.045));
    });
    ctx.textAlign = 'start'; // Reset alignment
  };

  // Generate template preview
  const generateTemplatePreview = async (template, videoUrl) => {
    const cacheKey = `${template.id}-${videoUrl}-${overlayColor}-${textColor}-${username}-${customHeader}`;
    
    if (previewCache[cacheKey]) {
      return previewCache[cacheKey];
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Template card dimensions (9:16 aspect ratio)
    canvas.width = 160;
    canvas.height = 285;
    
    // Draw background (video frame or placeholder)
    if (videoUrl) {
      const videoCanvas = await extractVideoFrame(videoUrl);
      if (videoCanvas) {
        ctx.drawImage(videoCanvas, 0, 0, canvas.width, canvas.height);
      } else {
        // Fallback gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#374151');
        gradient.addColorStop(1, '#1f2937');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } else {
      // Default gradient for Blank template
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#6b7280');
      gradient.addColorStop(1, '#374151');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Apply template-specific overlays
    const settings = { username, profilePic, customHeader, overlayColor, overlayOpacity, textColor };
    
    switch (template.id) {
      case 'social-profile':
        drawSonnetOverlay(ctx, canvas.width, canvas.height, settings);
        break;
      case 'title-only':
        drawFocusOverlay(ctx, canvas.width, canvas.height, settings);
        break;
      case 'bw-frame':
        // Apply grayscale filter
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = gray;     // Red
          data[i + 1] = gray; // Green
          data[i + 2] = gray; // Blue
        }
        ctx.putImageData(imageData, 0, 0);
        break;
    }
    
    const previewUrl = canvas.toDataURL();
    setPreviewCache(prev => ({ ...prev, [cacheKey]: previewUrl }));
    return previewUrl;
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;
    
    // Apply template to entire gallery (not just selected clips)
    applyTemplateToGallery();
    
    // Keep existing API call for now (will modify later)
    const template = MOCK_TEMPLATES.find(t => t.id === selectedTemplate);
    const applyData = {
      templateId: selectedTemplate,
      templateName: template.name,
      clips: [], // Empty array - template applies to all clips now
      customData: {
        username: username,
        profileIcon: profilePic,
        customTitle: getCustomHeader(), // Use getter instead of subscription
        customImage: customImage,
        bwLevel: bwLevel
      },
    };

    
    if (onTemplateApply) {
      await onTemplateApply(applyData);
    }
  };

  const selectedTemplateData = MOCK_TEMPLATES.find(t => t.id === selectedTemplate);

  // Memoize overlay settings to prevent unnecessary prop changes for TemplateCard
  const overlaySettings = useMemo(() => ({
    overlayColor,
    overlayOpacity,
    textColor,
    username,
    profilePic, // Add profilePic so template cards can show uploaded images
    customImage, // Add customImage for B&W template logo
    customHeader: customHeaderForTemplates, // Use separate subscription for real-time updates
    bwLevel,
    bwContrast,
    bwBrightness
  }), [overlayColor, overlayOpacity, textColor, username, profilePic, customImage, customHeaderForTemplates, bwLevel, bwContrast, bwBrightness]);

  return (
    <TooltipProvider>
      {/* Template open button - only visible when sidebar is closed */}
      <button
        onClick={toggleSidebar}
        className={`fixed right-6 top-1/2 -translate-y-1/2 flex h-10 px-3 items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-all duration-300 z-50 ${
          expanded ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
        }`}
        aria-label="Open templates"
      >
        <Palette className="h-4 w-4" />
        <span className="text-sm font-medium">Template</span>
      </button>

      {/* Sidebar - with smooth slide-in animation */}
      <Sidebar
        className={cn(
          "fixed right-4 top-1/2 -translate-y-1/2 h-[calc(100vh-1rem)] max-h-[90vh] w-[450px] rounded-xl border bg-background shadow-lg transition-all duration-300 z-40",
          // Smooth animations
          expanded 
            ? 'opacity-100 translate-x-0 scale-100' 
            : 'opacity-0 translate-x-full scale-95 pointer-events-none',
          // Responsive adjustments for mobile
          "md:right-4 right-2"
        )}
        collapsible="none"
      >
        <div className="flex h-full flex-col py-4 relative">
          {/* Close Button - Rounded arrow pointing right at center left */}
          <button
            onClick={toggleSidebar}
            className="absolute -left-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors z-10"
            aria-label="Close templates"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className={cn(
            "px-4 pb-4 border-b border-border",
            !expanded && "px-2"
          )}>
            {expanded ? (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Templates</h2>
                {/* Instruction text under Templates title */}
                {selectedTemplate && selectedTemplate !== 'default' && (
                  <p className="text-xs text-muted-foreground mb-4">
                    ↓ Click elements below to edit
                  </p>
                )}

                {/* Template-specific controls */}
                {selectedTemplate && (
                  <div className="space-y-3">
                    {/* Social Profile Template Controls */}
                    {selectedTemplate === 'social-profile' && (
                      <div className="space-y-3">
                        {/* Live Profile Preview - Interactive */}
                        <div 
                          className="p-3 rounded-lg text-white"
                          style={{ 
                            backgroundColor: `${overlayColor}${Math.round(overlayOpacity * 2.55).toString(16).padStart(2, '0')}`,
                            color: textColor 
                          }}
                        >
                          {/* Avatar & Username Section - Clickable */}
                          <div 
                            className="flex items-center gap-3 mb-2 cursor-pointer hover:bg-white/10 p-2 rounded transition-colors"
                            onClick={() => document.getElementById('profile-section').focus()}
                          >
                            {/* Avatar */}
                            <div className="relative group">
                              <div className="w-10 h-10 rounded-full bg-gray-600 border-2 border-white/20 flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:border-blue-400 group-hover:bg-gray-500">
                                {profilePic ? (
                                  <img src={profilePic} alt="Profile" className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" />
                                ) : (
                                  <User className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                                )}
                              </div>
                              
                              {/* Hover overlay with upload icon */}
                              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </div>
                              
                              {/* Hidden file input for avatar */}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    console.log('📷 [LOGO-UPLOAD] Converting logo to base64...');
                                    try {
                                      const base64 = await new Promise((resolve, reject) => {
                                        const reader = new FileReader();
                                        reader.onload = () => resolve(reader.result);
                                        reader.onerror = reject;
                                        reader.readAsDataURL(file);
                                      });
                                      setProfilePic(base64);
                                      console.log('✅ [LOGO-UPLOAD] Logo converted to base64, length:', base64.length);
                                    } catch (error) {
                                      console.error('❌ [LOGO-UPLOAD] Failed to convert logo:', error);
                                    }
                                  }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                title="Click to upload avatar"
                              />
                            </div>
                            
                            {/* Username & Verified Badge */}
                            <div className="flex-1">
                              <div className="flex items-center gap-0.5">
                                <input
                                  id="profile-section"
                                  value={username || 'YourUsername'}
                                  onChange={(e) => setUsername(e.target.value)}
                                  className="bg-transparent text-white font-semibold text-xs border-none outline-none focus:bg-white/10 px-0.5 rounded min-w-0"
                                  placeholder="YourUsername"
                                  style={{ width: `${(username || 'YourUsername').length}ch` }}
                                />
                                {/* Verified Badge - Immediately next to username like Twitter */}
                                <svg className="w-3 h-3 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                              </div>
                              <div className="text-[10px] text-gray-400 -mt-0.5">
                                @{username || 'yourusername'}
                              </div>
                            </div>
                          </div>

                          {/* Header Text - Clickable with Rich Text Support */}
                          <div className="mt-2">
                            <div
                              className="w-full bg-transparent text-white text-sm border border-dashed border-white/30 p-2 rounded min-h-[3rem] flex items-center justify-center text-center opacity-60"
                              style={{ color: textColor }}
                            >
                              <span className="text-xs">
                                Individual clips will use their own titles.<br/>
                                Edit titles directly on each video clip.
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Compact Color Controls */}
                        <div className="flex items-center justify-center gap-4 mt-2">
                          {/* Background Color */}
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Background</span>
                            <input
                              type="color"
                              value={overlayColor}
                              onChange={(e) => setOverlayColor(e.target.value)}
                              className="w-5 h-5 rounded border border-border cursor-pointer"
                            />
                          </div>
                          
                          {/* Text Color */}
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Text</span>
                            <input
                              type="color"
                              value={textColor}
                              onChange={(e) => setTextColor(e.target.value)}
                              className="w-5 h-5 rounded border border-border cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Selected Text Color Picker - appears when text is selected */}
                        {showTextColorPicker && selectedText && (
                          <div className="flex items-center justify-center gap-2 mt-2 p-2 bg-muted/50 rounded">
                            <span className="text-xs text-muted-foreground">"{selectedText.substring(0, 15)}{selectedText.length > 15 ? '...' : ''}"</span>
                            <input
                              type="color"
                              value={selectedTextColor}
                              onChange={(e) => setSelectedTextColor(e.target.value)}
                              className="w-5 h-5 rounded border border-border cursor-pointer"
                            />
                            <button
                              onClick={() => applyColorToSelectedText(selectedTextColor)}
                              className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90"
                            >
                              Apply
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Title Only Template Controls */}
                    {selectedTemplate === 'title-only' && (
                      <div className="space-y-3">
                        {/* Live Title Preview - Interactive */}
                        <div 
                          className="p-4 rounded-lg"
                          style={{ 
                            backgroundColor: `${overlayColor}${Math.round(overlayOpacity * 2.55).toString(16).padStart(2, '0')}`,
                            color: textColor 
                          }}
                        >
                          {/* Title Text - Clickable and centered with Rich Text Support */}
                          <div className="text-center">
                            <div
                              className="w-full bg-transparent text-lg font-bold text-center border border-dashed border-white/30 p-3 rounded min-h-[4rem] flex items-center justify-center text-center opacity-60"
                              style={{ color: textColor }}
                            >
                              <span className="text-sm">
                                Individual clips will use their own titles.<br/>
                                Edit titles directly on each video clip.
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Compact Color Controls */}
                        <div className="flex items-center justify-center gap-4 mt-2">
                          {/* Background Color */}
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Background</span>
                            <input
                              type="color"
                              value={overlayColor}
                              onChange={(e) => setOverlayColor(e.target.value)}
                              className="w-5 h-5 rounded border border-border cursor-pointer"
                            />
                          </div>
                          
                          {/* Text Color */}
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Text</span>
                            <input
                              type="color"
                              value={textColor}
                              onChange={(e) => setTextColor(e.target.value)}
                              className="w-5 h-5 rounded border border-border cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Selected Text Color Picker - appears when text is selected */}
                        {showTextColorPicker && selectedText && (
                          <div className="flex items-center justify-center gap-2 mt-2 p-2 bg-muted/50 rounded">
                            <span className="text-xs text-muted-foreground">"{selectedText.substring(0, 15)}{selectedText.length > 15 ? '...' : ''}"</span>
                            <input
                              type="color"
                              value={selectedTextColor}
                              onChange={(e) => setSelectedTextColor(e.target.value)}
                              className="w-5 h-5 rounded border border-border cursor-pointer"
                            />
                            <button
                              onClick={() => applyColorToSelectedText(selectedTextColor)}
                              className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90"
                            >
                              Apply
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* B&W Frame Template Controls */}
                    {selectedTemplate === 'bw-frame' && (
                      <div className="space-y-3">
                        {/* Two Column Layout */}
                        <div className="flex gap-3">
                          {/* Left Column - Logo Upload (Small Square) */}
                          <div className="flex-shrink-0">
                            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Logo</Label>
                            <div 
                              className="w-20 h-20 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors bg-muted/20"
                              onClick={() => document.getElementById('bg-image-upload').click()}
                            >
                              {customImage ? (
                                <img src={customImage} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                <>
                                  <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                                  <span className="text-[8px] text-muted-foreground">Upload</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    console.log('🖼️ [BW-LOGO-UPLOAD] File selected:', file.name, file.size);
                                    try {
                                      const base64 = await new Promise((resolve, reject) => {
                                        const reader = new FileReader();
                                        reader.onload = () => resolve(reader.result);
                                        reader.onerror = reject;
                                        reader.readAsDataURL(file);
                                      });
                                      setCustomImage(base64);
                                      console.log('✅ [BW-LOGO-UPLOAD] Logo converted to base64, length:', base64.length);
                                    } catch (error) {
                                      console.error('❌ [BW-LOGO-UPLOAD] Failed to convert logo:', error);
                                    }
                                  }
                                }}
                                className="hidden"
                                id="bg-image-upload"
                              />
                            </div>
                          </div>

                          {/* Right Column - B&W Controls (Stacked) */}
                          <div className="flex-1 space-y-3">
                            {/* B&W Level Slider */}
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">
                                B&W Level ({bwLevel}%)
                              </Label>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={bwLevel}
                                onChange={(e) => setBwLevel(e.target.value)}
                                className="w-full mt-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer slider"
                              />
                            </div>

                            {/* B&W Contrast Slider */}
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">
                                Contrast ({bwContrast}%)
                              </Label>
                              <input
                                type="range"
                                min="50"
                                max="200"
                                value={bwContrast}
                                onChange={(e) => setBwContrast(e.target.value)}
                                className="w-full mt-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer slider"
                              />
                            </div>

                            {/* B&W Brightness Slider */}
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground">
                                Brightness ({bwBrightness}%)
                              </Label>
                              <input
                                type="range"
                                min="30"
                                max="150"
                                value={bwBrightness}
                                onChange={(e) => setBwBrightness(e.target.value)}
                                className="w-full mt-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer slider"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center">
                      <Palette className="w-4 h-4 text-primary" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left">Templates</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>

          {/* Template List */}
          <div className="flex-1 overflow-y-auto p-4">
            {expanded ? (
              <div className="grid grid-cols-2 gap-4">
                {/* Show skeleton loading when clips are loading */}
                {isLoadingClips ? (
                  <TemplateCardsSkeletonGrid count={4} />
                ) : (
                  MOCK_TEMPLATES.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      isSelected={selectedTemplate === template.id}
                      onSelect={handleTemplateSelect}
                      bestPreviewVideo={bestPreviewVideoFromQuery || bestPreviewVideo}
                      overlaySettings={overlaySettings}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3 flex flex-col items-center">
                {MOCK_TEMPLATES.map((template) => (
                  <Tooltip key={template.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleTemplateSelect(template.id)}
                        className={cn(
                          "w-10 h-10 rounded-md flex items-center justify-center transition-colors",
                          selectedTemplate === template.id
                            ? "bg-primary/20 text-primary border-2 border-primary"
                            : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Palette className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">{template.name}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}
          </div>


          {/* Apply Button */}
          <div className="px-4 pt-3">
            {expanded ? (
              <Button
                onClick={handleApplyTemplate}
                disabled={!selectedTemplate || isApplying}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-9 text-sm"
              >
                {isApplying ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Applying...
                  </>
                ) : (
                  <>
                    <Palette className="w-3 h-3 mr-2" />
                    {isTemplateApplied ? 'Update Template' : 'Apply Template'}
                  </>
                )}
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleApplyTemplate}
                    disabled={!selectedTemplate || isApplying}
                    className="w-10 h-10 p-0 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {isApplying ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Palette className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {isTemplateApplied ? 'Update Template' : 'Apply Template'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </Sidebar>
    </TooltipProvider>
  );
}