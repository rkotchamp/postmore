"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Download,
  Share2,
  X,
  Edit3,
  Check,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Play, User } from "lucide-react";
import { useUpdateClip } from '@/app/hooks/useUpdateClip';

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
  isTemplateApplied = false,
  // NEW: Project ID for clip updates
  projectId,
  // Download progress handlers
  setIsDownloading,
  setDownloadProgress
}) {

  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  
  // Inline editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  
  // Text selection state for color changing
  const [selectedText, setSelectedText] = useState('');
  const [selectedTextColor, setSelectedTextColor] = useState('#ffffff');
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  
  
  // TanStack Query mutation for updating clips
  const updateClipMutation = useUpdateClip(projectId);

  // Local state to track the updated content after save
  const [localTemplateHeader, setLocalTemplateHeader] = useState(null);
  const [localTitle, setLocalTitle] = useState(null);

  // Determine which text source to use based on applied template
  const shouldUseTemplateHeader = useMemo(() => {
    const result = appliedTemplate && (appliedTemplate === 'social-profile' || appliedTemplate === 'title-only');
    return result;
  }, [appliedTemplate, clip.id, clip.title, clip.templateHeader]);

  // Base text content (what should be displayed when not editing)
  const baseTextContent = useMemo(() => {
    // If social-profile or title-only template is applied, use templateHeader
    if (shouldUseTemplateHeader) {
      // Prioritize local updated templateHeader first (after save)
      if (localTemplateHeader !== null) {
        return localTemplateHeader;
      }
      return clip.templateHeader || ''; // Use templateHeader directly, no fallback
    }
    
    // For all other templates (Blank, Black & White, etc.), use the original title
    // Prioritize local updated title first (after save)
    if (localTitle !== null) {
      return localTitle;
    }
    const result = clip.title || '';
    return result;
  }, [shouldUseTemplateHeader, localTemplateHeader, localTitle, clip.templateHeader, clip.title]);

  // Display text content (what to show in UI and overlay) - HTML version with colors
  const displayTextContent = useMemo(() => {
    // If currently editing, show the HTML version with colors for overlay
    if (isEditingTitle) {
      // Return the HTML version (with colors) for overlay display
      const result = editedTitle === '<br>' ? '' : editedTitle;
      return result;
    }
    
    // Otherwise use the base text content (HTML version with colors)
    return baseTextContent;
  }, [isEditingTitle, editedTitle, baseTextContent]);

  // Helper function to extract plain text from HTML
  const getPlainText = useCallback((htmlContent) => {
    if (!htmlContent) return '';
    // Create a temporary element to strip HTML tags
    const temp = document.createElement('div');
    temp.innerHTML = htmlContent;
    return temp.textContent || temp.innerText || '';
  }, []);

  // Handlers for inline editing
  const handleStartEdit = useCallback(() => {
    // Start with plain text for editing (no HTML formatting)
    const plainText = getPlainText(baseTextContent);
    setEditedTitle(plainText);
    setIsEditingTitle(true);
  }, [baseTextContent, getPlainText]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingTitle(false);
    setEditedTitle('');
    setShowTextColorPicker(false);
    setSelectedText('');
  }, []);

  const handleSaveEdit = useCallback(() => {
    // Get the actual content from the contentEditable div to ensure we have the latest HTML
    const editableDiv = document.querySelector('div[data-editing-title="true"]');
    const currentContent = editableDiv ? editableDiv.innerHTML : editedTitle;
    
    // Clean up the content (remove empty <br> placeholders)
    const cleanContent = currentContent === '<br>' ? '' : currentContent;
    
    // Extract plain text for comparison
    const plainText = cleanContent.replace(/<[^>]*>/g, '').trim();
    const basePlainText = baseTextContent.replace(/<[^>]*>/g, '').trim();
    
    // Only save if there's content and it's different from the base
    if (plainText && (plainText !== basePlainText || cleanContent !== baseTextContent)) {
      // Update local state immediately to reflect the new content
      if (shouldUseTemplateHeader) {
        setLocalTemplateHeader(cleanContent);
      } else {
        setLocalTitle(cleanContent);
      }
      
      // Save to templateHeader if social-profile/title-only template, otherwise save to title
      const updateField = shouldUseTemplateHeader ? 'templateHeader' : 'title';
      
      updateClipMutation.mutate({
        clipId: clip.id,
        updates: { [updateField]: cleanContent }
      });
    } else if (!plainText) {
      // If no text, clear the appropriate field
      const updateField = shouldUseTemplateHeader ? 'templateHeader' : 'title';
      
      // Update local state immediately
      if (shouldUseTemplateHeader) {
        setLocalTemplateHeader('');
      } else {
        setLocalTitle('');
      }
      
      updateClipMutation.mutate({
        clipId: clip.id,
        updates: { [updateField]: '' }
      });
    }
    
    // Exit edit mode and clean up
    setIsEditingTitle(false);
    setEditedTitle('');
    setShowTextColorPicker(false);
    setSelectedText('');
  }, [editedTitle, baseTextContent, shouldUseTemplateHeader, updateClipMutation, clip.id]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  // Text selection handler for color changing
  const handleTextSelection = useCallback(() => {
    // Small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      
      // Only show color picker if we're in editing mode and have text selected
      if (isEditingTitle && text && text.length > 0) {
        setSelectedText(text);
        setShowTextColorPicker(true);
        ('✅ [TEXT-SELECTION] Color picker shown for:', `"${text}"`);
      } else if (!text || text.length === 0) {
        // Hide color picker if no text selected
        setShowTextColorPicker(false);
        setSelectedText('');
        ('❌ [TEXT-SELECTION] No text selected, hiding picker');
      }
    }, 10);
  }, [isEditingTitle]);

  // Add selection change listener when editing
  useEffect(() => {
    if (isEditingTitle) {
      const handleSelectionChange = () => {
        handleTextSelection();
      };
      
      document.addEventListener('selectionchange', handleSelectionChange);
      return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }
  }, [isEditingTitle, handleTextSelection]);

  // Apply color to selected text
  const applyColorToSelectedText = useCallback((color) => {
    const editableDiv = document.querySelector('div[data-editing-title="true"]');
    if (!editableDiv) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount > 0) {
      ('⚠️ [COLOR-APPLY] No text selection found');
      return;
    }
    
    try {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      
      if (!selectedText) {
        ('⚠️ [COLOR-APPLY] No text in selection');
        return;
      }
      
      // Create a span element with the color
      const span = document.createElement('span');
      span.style.color = color;
      span.textContent = selectedText;
      
      // Replace the selected content with the colored span
      range.deleteContents();
      range.insertNode(span);
      
      // Clear the selection
      selection.removeAllRanges();
      
      // Update the state with the new HTML content
      const newContent = editableDiv.innerHTML;
      setEditedTitle(newContent);
      
      ('✅ [COLOR-APPLY] Successfully applied color:', color);
      ('📝 [COLOR-APPLY] Selected text:', selectedText);
      ('🎨 [COLOR-APPLY] New HTML content:', newContent);
      
      // Force a re-render by triggering input event
      const inputEvent = new Event('input', { bubbles: true });
      editableDiv.dispatchEvent(inputEvent);
      
    } catch (error) {
      ('❌ [COLOR-APPLY] Color application failed:', error);
      
      // Fallback to execCommand
      try {
        editableDiv.focus();
        const success = document.execCommand('foreColor', false, color);
        if (success) {
          setEditedTitle(editableDiv.innerHTML);
          ('✅ [COLOR-APPLY] Fallback execCommand succeeded');
        }
      } catch (fallbackError) {
        ('❌ [COLOR-APPLY] Fallback also failed:', fallbackError);
      }
    }
  }, []);

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
    
    // Get the appropriate video URL from clip properties
    if (preferredOrientation === 'horizontal' && clip.horizontalVideoUrl) {
      (`✅ [VIDEO-SWAP] Using horizontal video (2.35:1) for ${appliedTemplate}`);
      return clip.horizontalVideoUrl;
    } else if (preferredOrientation === 'vertical' && clip.verticalVideoUrl) {
      (`✅ [VIDEO-SWAP] Using vertical video (9:16) for ${appliedTemplate}`);
      return clip.verticalVideoUrl;
    }
    
    // Fallback to default URL
    (`⚠️ [VIDEO-SWAP] Falling back to default URL`);
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
    
    console.log('🔄 [DOWNLOAD] Starting download process for clip:', clip._id);
    console.log('🔄 [DOWNLOAD] Clip data:', {
      title: clip.title,
      videoUrl,
      isTemplateApplied,
      appliedTemplate,
      hasDisplayText: !!displayTextContent
    });
    
    // Check if user has template applied - if yes, download with template
    const hasTemplate = isTemplateApplied && appliedTemplate && displayTextContent;
    
    console.log('🔍 [DOWNLOAD] Template check result:', {
      hasTemplate,
      isTemplateApplied,
      appliedTemplate,
      hasDisplayTextContent: !!displayTextContent
    });
    
    if (hasTemplate) {
      // User has template applied - download video WITH template overlay
      console.log('📥 [DOWNLOAD] Template detected - downloading with overlay');
      await downloadWithTemplate();
    } else {
      // No template - download original video
      console.log('📥 [DOWNLOAD] No template - downloading original video');
      await downloadOriginal();
    }
    
    // Download with template processing
    async function downloadWithTemplate() {
      setIsDownloading(true);
      setDownloadProgress('Preparing template...');
      
      try {
        const plainText = getPlainText(displayTextContent);
        const filename = `${plainText || `clip_${clip.startTime}s`}_templated.mp4`;
        
        const templateData = {
          template: appliedTemplate,
          title: displayTextContent, // HTML with colors
          plainTitle: plainText,
          templateHeader: displayTextContent, // Include templateHeader for download API
          settings: appliedSettings, // Logo already converted to base64 on upload
          aspectRatio: aspectRatio
        };
        
        console.log('🎬 [TEMPLATE-DOWNLOAD] Processing with data:', templateData);
        console.log('🎬 [TEMPLATE-DOWNLOAD] Request payload:', {
          clipId: clip._id,
          videoUrl: videoUrl,
          filename: filename,
          templateData: templateData
        });
        
        setDownloadProgress('Processing video with template...');
        
        const response = await fetch('/api/download-video-with-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clipId: clip._id,
            videoUrl: videoUrl,
            filename: filename,
            templateData: templateData
          }),
        });
        
        console.log('📡 [TEMPLATE-DOWNLOAD] API Response:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText
        });
        
        if (!response.ok) {
          console.log('⚠️ [TEMPLATE-DOWNLOAD] Template processing not available, using original');
          setDownloadProgress('Template processing failed, downloading original...');
          await downloadOriginal();
          return;
        }
        
        setDownloadProgress('Finalizing download...');
        const blob = await response.blob();
        console.log('📦 [TEMPLATE-DOWNLOAD] Blob created:', {
          size: blob.size,
          type: blob.type
        });
        
        triggerDownload(blob, filename);
        console.log('✅ [TEMPLATE-DOWNLOAD] Success!');
        
        setDownloadProgress('Download completed!');
        setTimeout(() => {
          setIsDownloading(false);
          setDownloadProgress('');
        }, 1000);
        
      } catch (error) {
        console.error('❌ [TEMPLATE-DOWNLOAD] Failed, falling back to original:', error);
        setDownloadProgress('Error occurred, trying original download...');
        await downloadOriginal();
      } finally {
        setTimeout(() => {
          setIsDownloading(false);
          setDownloadProgress('');
        }, 2000);
      }
    }
    
    // Download original video
    async function downloadOriginal() {
      console.log('📥 [DOWNLOAD-ORIGINAL] Starting original download');
      console.log('📥 [DOWNLOAD-ORIGINAL] Parameters:', {
        hasOnDownload: !!onDownload,
        videoUrl,
        filename: `${clip.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'clip'}.mp4`
      });
      
      if (onDownload && videoUrl) {
        console.log('📥 [DOWNLOAD-ORIGINAL] Using onDownload callback');
        onDownload(clip);
        return;
      }
      
      if (!videoUrl) {
        console.log('❌ [DOWNLOAD-ORIGINAL] No video URL available');
        return;
      }
      
      try {
        const filename = `${clip.title || `clip_${clip.startTime}s`}.mp4`;
        console.log('📥 [DOWNLOAD-ORIGINAL] Making API call to /api/download-video');
        console.log('📥 [DOWNLOAD-ORIGINAL] Request data:', { videoUrl, filename });
        
        const response = await fetch('/api/download-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: videoUrl, filename: filename }),
        });
        
        console.log('📡 [DOWNLOAD-ORIGINAL] API Response:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText
        });
        
        if (!response.ok) {
          throw new Error(`Download failed: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        console.log('📦 [DOWNLOAD-ORIGINAL] Blob created:', {
          size: blob.size,
          type: blob.type
        });
        
        triggerDownload(blob, filename);
        console.log('✅ [DOWNLOAD-ORIGINAL] Success!');
        
      } catch (error) {
        console.error('❌ [ORIGINAL-DOWNLOAD] Failed:', error);
        console.log('🔗 [DOWNLOAD-ORIGINAL] Falling back to opening URL in new tab');
        window.open(videoUrl, '_blank');
      }
    }
    
    // Helper to trigger browser download
    function triggerDownload(blob, filename) {
      console.log('🔗 [TRIGGER-DOWNLOAD] Creating download link');
      console.log('🔗 [TRIGGER-DOWNLOAD] Parameters:', {
        blobSize: blob.size,
        blobType: blob.type,
        filename
      });
      
      const blobUrl = URL.createObjectURL(blob);
      console.log('🔗 [TRIGGER-DOWNLOAD] Created blob URL:', blobUrl);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      console.log('🔗 [TRIGGER-DOWNLOAD] Triggering click');
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      console.log('🔗 [TRIGGER-DOWNLOAD] Cleanup completed');
    }
    
  }, [onDownload, videoUrl, clip, isTemplateApplied, appliedTemplate, displayTextContent, appliedSettings, aspectRatio, getPlainText]);

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
                      <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center overflow-hidden flex-shrink-0">
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
                    <div 
                      className="text-xs mt-1 max-h-8 overflow-hidden"
                      style={{ 
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                        lineHeight: '1rem'
                      }}
                      dangerouslySetInnerHTML={{ 
                        __html: (() => {
                          ('🖼️ [OVERLAY-RENDER] Social Profile overlay rendering:', displayTextContent);
                          return displayTextContent;
                        })()
                      }}
                    />
                  </div>
                )}
                
                {appliedTemplate === 'title-only' && (
                  <div 
                    className="absolute inset-0 p-3 pointer-events-none flex flex-col justify-start"
                    style={{ 
                      paddingTop: '3px',
                      color: appliedSettings.textColor || '#ffffff'
                    }}
                  >
                    <div 
                      className="text-sm font-bold max-w-full text-center"
                      style={{ 
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                        lineHeight: '1.3',
                        fontFamily: '"Chirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        marginTop: '0'
                      }}
                      dangerouslySetInnerHTML={{ 
                        __html: displayTextContent
                      }}
                    />
                  </div>
                )}
                

                {/* B&W template logo overlay */}
                {appliedTemplate === 'bw-frame' && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    {appliedSettings.customImage ? (
                      <img src={appliedSettings.customImage} alt="Logo" className="h-14 max-w-44 object-contain" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-500/30 flex items-center justify-center">
                        <span className="text-white/80 text-xs font-semibold">logo</span>
                      </div>
                    )}
                  </div>
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
        {/* Inline Editable Title */}
        <div className="mb-3 group">
          {isEditingTitle ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  contentEditable
                  suppressContentEditableWarning={true}
                  data-editing-title="true"
                  onInput={(e) => {
                    const content = e.target.innerHTML;
                    ('📝 [CONTENT-EDIT] Input changed:', content);
                    
                    // Prevent completely empty content to avoid cursor issues
                    if (content === '' || content === '<br>') {
                      e.target.innerHTML = '<br>';
                      setEditedTitle('<br>');
                    } else {
                      setEditedTitle(content);
                    }
                  }}
                  onKeyDown={handleKeyPress}
                  onMouseUp={handleTextSelection}
                  onKeyUp={handleTextSelection}
                  onSelect={handleTextSelection}
                  className={`flex-1 min-h-[2.5rem] min-w-[100px] font-semibold text-foreground bg-transparent border border-primary/50 rounded px-2 py-1 focus:outline-none focus:border-primary ${
                    aspectRatio === "vertical" ? "text-sm" : "text-base"
                  }`}
                  style={{ display: 'block' }}
                  autoFocus
                  ref={(el) => {
                    // Show plain text in the editing area (no HTML formatting)
                    if (el) {
                      // Helper function to extract plain text from HTML
                      const getPlainTextInline = (htmlContent) => {
                        if (!htmlContent) return '';
                        const temp = document.createElement('div');
                        temp.innerHTML = htmlContent;
                        return temp.textContent || temp.innerText || '';
                      };
                      
                      const plainTextContent = getPlainTextInline(editedTitle);
                      if (el.textContent !== plainTextContent) {
                        el.textContent = plainTextContent;
                      }
                    }
                  }}
                />
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveEdit}
                    disabled={updateClipMutation.isPending}
                    className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-600"
                  >
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    disabled={updateClipMutation.isPending}
                    className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              {/* Color picker for selected text */}
              {showTextColorPicker && selectedText && (
                <div className="flex items-center justify-center gap-2 p-2 bg-muted/50 rounded border">
                  <span className="text-xs text-muted-foreground">
                    "{selectedText.substring(0, 15)}{selectedText.length > 15 ? '...' : ''}"
                  </span>
                  <input
                    type="color"
                    value={selectedTextColor}
                    onChange={(e) => {
                      setSelectedTextColor(e.target.value);
                      applyColorToSelectedText(e.target.value);
                    }}
                    className="w-6 h-6 rounded border cursor-pointer"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowTextColorPicker(false);
                      setSelectedText('');
                    }}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div 
              className={`flex items-start justify-between gap-2 cursor-pointer font-semibold text-foreground line-clamp-2 leading-relaxed ${
                aspectRatio === "vertical" ? "text-sm" : "text-base"
              }`}
              onClick={handleStartEdit}
            >
              <span className="flex-1 min-w-0">
                {getPlainText(displayTextContent)}
                {isTemplateApplied && appliedTemplate && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Edit3 className="w-3 h-3" />
                    Click to edit
                  </span>
                )}
              </span>
              <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
            </div>
          )}
          {updateClipMutation.error && (
            <p className="text-xs text-red-500 mt-1">
              Failed to update title. Please try again.
            </p>
          )}
        </div>

        {/* Virality Score and Action Buttons */}
        <div className="flex items-center justify-between">
          {/* Virality Score on left */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground">Virality:</span>
            <span className={`text-xs font-bold ${
              clip.viralityScore >= 80 ? 'text-green-600' :
              clip.viralityScore >= 60 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {clip.viralityScore}%
            </span>
          </div>
          
          {/* Action Buttons on right */}
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
        </div>
      </div>
    </Card>
  );
}