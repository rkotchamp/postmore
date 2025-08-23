"use client";

import { useState, useEffect, useRef } from "react";
import {
  Palette,
  User,
  Type,
  Image,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Sidebar } from "@/app/components/ui/sidebar";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/app/components/ui/tooltip";

// Template Card Component with Video Preview
function TemplateCard({ template, isSelected, onSelect, className, selectedClips, overlaySettings }) {
  const [showVideo, setShowVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  // Get preview video URL from first selected clip - prioritize dual aspect ratio structure
  const selectedClip = selectedClips?.[0];
  const previewVideoUrl = selectedClip?.previewVideo?.url || 
                         selectedClip?.generatedVideo?.vertical?.url || 
                         selectedClip?.generatedVideo?.horizontal?.url ||
                         selectedClip?.generatedVideo?.url || 
                         selectedClip?.videoUrl;
  
  // Debug logging
  console.log('🎬 [TEMPLATE-CARD] Debug Info:', {
    templateId: template.id,
    templateName: template.name,
    selectedClipsLength: selectedClips?.length || 0,
    firstClip: selectedClips?.[0] ? {
      id: selectedClips[0].id,
      title: selectedClips[0].title,
      previewVideoUrl: selectedClips[0].previewVideo?.url,
      videoUrl: selectedClips[0].videoUrl,
      generatedVideoUrl: selectedClips[0].generatedVideo?.url,
      generatedVideo: selectedClips[0].generatedVideo,
    } : null,
    resolvedPreviewUrl: previewVideoUrl
  });

  // Auto-play video on hover for better UX
  const handleMouseEnter = () => {
    setShowVideo(true);
    if (videoRef.current && previewVideoUrl) {
      videoRef.current.play().catch(() => {
        setVideoError(true);
      });
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
        "relative p-3 border rounded-lg cursor-pointer transition-all duration-200 group",
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50 hover:bg-muted/50',
        className
      )}
      onClick={() => onSelect(template.id)}
    >
      {/* Template Preview - 1-minute video with overlay */}
      <div 
        className="aspect-[9/16] w-full mb-2 rounded-md overflow-hidden bg-muted relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {previewVideoUrl && !videoError ? (
          <div className="relative w-full h-full">
            {/* Background video */}
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
              onError={() => setVideoError(true)}
            >
              <source src={previewVideoUrl} type="video/mp4" />
            </video>
            
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
                    <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center">
                      <User className="w-3 h-3" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{overlaySettings?.username || 'YourUsername'}</div>
                      <div className="text-xs opacity-80">@{(overlaySettings?.username || 'username').toLowerCase()}</div>
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
              
              {template.id === 'bw-frame' && (
                <div className="absolute inset-0 bg-black/20" style={{ filter: 'grayscale(100%)' }} />
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
            <div className="text-center">
              <Palette className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{template.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Template Info */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground text-sm">{template.name}</h3>
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
}

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
  onTemplateApply,
  isApplying = false 
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('default');
  const [username, setUsername] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [customHeader, setCustomHeader] = useState('');
  const [customImage, setCustomImage] = useState('');
  const [bwLevel, setBwLevel] = useState(50);
  const [overlayColor, setOverlayColor] = useState('#000000');
  const [overlayOpacity, setOverlayOpacity] = useState(80);
  const [textColor, setTextColor] = useState('#ffffff');
  const [selectedText, setSelectedText] = useState('');
  const [selectedTextColor, setSelectedTextColor] = useState('#ffffff');
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [previewCache, setPreviewCache] = useState({});

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
  useEffect(() => {
    setPreviewCache({});
  }, [overlayColor, overlayOpacity, textColor, username, customHeader, profilePic]);

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

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
  };

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
    if (!selectedTemplate || selectedClips.length === 0) return;
    
    const template = MOCK_TEMPLATES.find(t => t.id === selectedTemplate);
    const applyData = {
      templateId: selectedTemplate,
      templateName: template.name,
      clips: selectedClips,
      customData: {
        username: username,
        profileIcon: profilePic,
        customTitle: customHeader,
        customImage: customImage,
        bwLevel: bwLevel
      },
    };

    console.log('🎨 [TEMPLATE] Applying template:', applyData);
    
    if (onTemplateApply) {
      await onTemplateApply(applyData);
    }
  };

  const selectedTemplateData = MOCK_TEMPLATES.find(t => t.id === selectedTemplate);

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
          "fixed right-4 top-1/2 -translate-y-1/2 h-[calc(100vh-1rem)] max-h-[90vh] w-80 rounded-xl border bg-background shadow-lg transition-all duration-300 z-40",
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
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const url = URL.createObjectURL(file);
                                    setProfilePic(url);
                                  }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                title="Click to upload avatar"
                              />
                            </div>
                            
                            {/* Username & Verified Badge */}
                            <div className="flex-1">
                              <div className="flex items-center">
                                <input
                                  id="profile-section"
                                  value={username || 'YourUsername'}
                                  onChange={(e) => setUsername(e.target.value)}
                                  className="bg-transparent text-white font-semibold text-sm border-none outline-none focus:bg-white/10 px-1 rounded flex-shrink-0"
                                  placeholder="YourUsername"
                                  style={{ width: `${Math.max(10, (username || 'YourUsername').length)}ch` }}
                                />
                                {/* Verified Badge - Right next to username */}
                                <svg className="w-4 h-4 text-blue-500 ml-1 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                              </div>
                              <div className="text-xs text-gray-400">
                                @{username || 'yourusername'}
                              </div>
                            </div>
                          </div>

                          {/* Header Text - Clickable with Rich Text Support */}
                          <div className="mt-2">
                            <div
                              contentEditable
                              suppressContentEditableWarning={true}
                              onInput={(e) => setCustomHeader(e.target.innerText)}
                              onMouseUp={handleTextSelection}
                              onKeyUp={handleTextSelection}
                              className="w-full bg-transparent text-white text-sm border-none outline-none focus:bg-white/10 p-2 rounded resize-none min-h-[3rem]"
                              style={{ color: textColor }}
                            >
                              {customHeader || 'Your amazing header text will appear here...'}
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
                              contentEditable
                              suppressContentEditableWarning={true}
                              onInput={(e) => setCustomHeader(e.target.innerText)}
                              onMouseUp={handleTextSelection}
                              onKeyUp={handleTextSelection}
                              className="w-full bg-transparent text-lg font-bold text-center border-none outline-none focus:bg-white/10 p-3 rounded resize-none leading-tight min-h-[4rem]"
                              style={{ color: textColor }}
                            >
                              {customHeader || 'Your amazing title text will appear here...'}
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
                        {/* Image Upload */}
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Background Image</Label>
                          <div className="mt-1 border-2 border-dashed border-border rounded-md p-4 text-center cursor-pointer hover:border-primary transition-colors">
                            {customImage ? (
                              <img src={customImage} alt="Background" className="w-full h-20 object-cover rounded mb-2" />
                            ) : (
                              <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                  const url = URL.createObjectURL(file);
                                  setCustomImage(url);
                                }
                              }}
                              className="hidden"
                              id="bg-image-upload"
                            />
                            <label
                              htmlFor="bg-image-upload"
                              className="text-xs text-primary cursor-pointer hover:underline"
                            >
                              {customImage ? 'Change Image' : 'Upload Image'}
                            </label>
                          </div>
                        </div>

                        {/* B&W Level Slider */}
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">
                            Black & White Level ({bwLevel}%)
                          </Label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={bwLevel}
                            onChange={(e) => setBwLevel(e.target.value)}
                            className="w-full mt-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
                          />
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
              <div className="grid grid-cols-2 gap-3">
                {MOCK_TEMPLATES.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplate === template.id}
                    onSelect={handleTemplateSelect}
                    selectedClips={selectedClips}
                    overlaySettings={{
                      overlayColor,
                      overlayOpacity,
                      textColor,
                      username,
                      customHeader
                    }}
                  />
                ))}
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
                disabled={selectedClips.length === 0 || isApplying}
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
                    Apply Template
                    {selectedClips.length > 0 && ` (${selectedClips.length})`}
                  </>
                )}
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleApplyTemplate}
                    disabled={selectedClips.length === 0 || isApplying}
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
                  Apply Template {selectedClips.length > 0 && `(${selectedClips.length})`}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </Sidebar>
    </TooltipProvider>
  );
}