"use client";

import { useState, memo, useCallback } from "react";
import { useTemplateStore } from "../../lib/store/templateStore";
import { useShareStore } from "@/app/lib/store/shareStore";
import { useFetchAllAccountsContext } from "@/app/context/FetchAllAccountsContext";
import {
  Filter,
  MoreHorizontal,
  ArrowLeft,
  Download,
  Share2,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import ClipCard from "./ClipCard";
import TemplateFloatingSidebar from "./TemplateFloatingSidebar";
import DownloadProgressPopup from "./DownloadProgressPopup";
import { ShareModal } from "@/app/lib/video-sharing/components/ShareModal";
import { ShareProgressModal } from "@/app/lib/video-sharing/components/ShareProgressModal";

const defaultClips = [
  {
    id: "1",
    title: "CSS Fade Animation: Easy Transitions For Your Website",
    duration: "00:18",
    timestamp: "00:00",
    thumbnail: "/placeholder.svg?height=200&width=300&text=CSS+Fade+Animation",
    isPro: true,
  },
  {
    id: "2",
    title: "Mastering Intersection Observer API: Animate Elements!",
    duration: "00:15",
    timestamp: "00:00",
    thumbnail:
      "/placeholder.svg?height=200&width=300&text=Intersection+Observer",
    isPro: true,
  },
  {
    id: "3",
    title: "JavaScript & CSS: Cool Tricks and Next-Gen Features",
    duration: "00:15",
    timestamp: "00:00",
    thumbnail: "/placeholder.svg?height=200&width=300&text=JS+CSS+Tricks",
    isPro: true,
  },
  {
    id: "4",
    title: "Animate on Scroll is DEAD? New CSS Scroll Timeline!",
    duration: "00:31",
    timestamp: "00:00",
    thumbnail: "/placeholder.svg?height=200&width=300&text=Scroll+Timeline",
    isPro: true,
  },
  {
    id: "5",
    title: "GitHub Copilot: How Animations Convinced Me To Buy",
    duration: "00:52",
    timestamp: "00:00",
    thumbnail: "/placeholder.svg?height=200&width=300&text=GitHub+Copilot",
    isPro: true,
  },
  {
    id: "6",
    title: "Pro Animation Tips: Create Stunning Effects with CSS",
    duration: "01:11",
    timestamp: "00:00",
    thumbnail: "/placeholder.svg?height=200&width=300&text=Pro+Animation",
    isPro: true,
  },
  {
    id: "7",
    title: "Advanced CSS Techniques: Modern Web Development",
    duration: "00:04",
    timestamp: "00:00",
    thumbnail: "/placeholder.svg?height=200&width=300&text=Advanced+CSS",
    isPro: true,
  },
  {
    id: "8",
    title: "Web Animation Fundamentals: Getting Started Guide",
    duration: "01:09",
    timestamp: "00:00",
    thumbnail: "/placeholder.svg?height=200&width=300&text=Animation+Guide",
    isPro: true,
  },
];

const ClipsGallery = memo(function ClipsGallery({
  clips = defaultClips,
  projectId, // Add projectId for TanStack Query
  onClipSelect,
  onBack,
  aspectRatio = "vertical", // "video" or "vertical"
}) {
  const [selectedClips, setSelectedClips] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  // Download progress state (global for all clips)
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [clipsToShare, setClipsToShare] = useState([]);

  // Get template state to pass to ClipCards
  const {
    appliedTemplate,
    appliedSettings,
    isTemplateApplied
  } = useTemplateStore();

  // Get authenticated accounts from context
  const { accounts = [], isLoading: loadingAccounts } = useFetchAllAccountsContext();

  // Get share store methods
  const { setSelectedClips: setShareStoreClips, setShowShareModal: setShareStoreModal } = useShareStore();

  // Moved handleClipSelect logic into the ClipCard component for better encapsulation

  const toggleSelectMode = useCallback(() => {
    setSelectMode(!selectMode);
    if (selectMode) {
      setSelectedClips([]);
    }
  }, [selectMode]);

  const handleBulkDownload = useCallback(async () => {
    const clipsToDownload = selectMode && selectedClips.length > 0 
      ? clips.filter(clip => selectedClips.includes(clip.id))
      : clips;

    // Show download progress
    setIsDownloading(true);
    
    for (let i = 0; i < clipsToDownload.length; i++) {
      const clip = clipsToDownload[i];
      setDownloadProgress(`Downloading ${i + 1} of ${clipsToDownload.length} videos...`);
      
      if (clip.videoUrl) {
        try {
          // Check if template is applied and use template processing
          if (isTemplateApplied && appliedTemplate) {
            await downloadWithTemplate(clip);
          } else {
            await downloadOriginal(clip);
          }
          
          // Small delay between downloads
          if (i < clipsToDownload.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          // Continue with next clip even if one fails
        }
      }
    }
    
    // Hide progress popup
    setDownloadProgress('Bulk download completed!');
    setTimeout(() => {
      setIsDownloading(false);
      setDownloadProgress('');
    }, 1500);
  }, [clips, selectedClips, selectMode, isTemplateApplied, appliedTemplate, appliedSettings, aspectRatio, setIsDownloading, setDownloadProgress]);

  // Helper function for template download - Copy exact logic from working ClipCard
  const downloadWithTemplate = async (clip) => {
    // Use the same logic as working individual download
    const displayTextContent = clip.templateHeader || clip.title || '';
    
    // Clean text - remove HTML and handle special characters/emojis properly
    const plainText = displayTextContent
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters (emojis, special chars)
      .trim();
    
    // Clean filename - ensure it's safe for filesystem
    const safeTitle = plainText.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
    const filename = `${safeTitle || `clip_${clip.startTime}s`}_templated.mp4`;
    
    // Copy exact templateData structure from working download
    const templateData = {
      template: appliedTemplate,
      title: displayTextContent, // HTML with colors (same as working version)
      plainTitle: plainText,
      templateHeader: displayTextContent, // Include templateHeader for download API (same as working version)
      settings: appliedSettings, // Logo already converted to base64 on upload
      aspectRatio: aspectRatio
    };
    
    
    // Use same video URL logic - prioritize different video formats like ClipCard
    const videoUrl = clip.horizontalVideoUrl || clip.verticalVideoUrl || clip.videoUrl;
    
    const response = await fetch('/api/download-video-with-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clipId: clip.id,
        videoUrl: videoUrl, // Use same videoUrl logic as working version
        filename: filename,
        templateData: templateData
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    triggerDownload(blob, filename);
  };

  // Helper function for original download
  const downloadOriginal = async (clip) => {
    const filename = `${clip.title || `clip_${clip.startTime}s`}.mp4`;
    
    const response = await fetch('/api/download-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoUrl: clip.videoUrl,
        filename: filename
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    triggerDownload(blob, filename);
  };

  // Helper to trigger browser download
  const triggerDownload = (blob, filename) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const handleTemplateApply = useCallback(async (templateData) => {
    setIsApplyingTemplate(true);

    try {

      // TODO: Call template application API
      // For now, just simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Show success message

      // Optionally refresh clips or update UI state

    } catch (error) {
      console.error('❌ [TEMPLATE-APPLY] Failed to apply template:', error);
      // TODO: Show error toast/notification
    } finally {
      setIsApplyingTemplate(false);
    }
  }, []);

  // Handle individual clip share
  const handleClipShare = useCallback((clip) => {
    setClipsToShare([clip]);
    setShareStoreClips([clip]);
    setShowShareModal(true);
  }, [setShareStoreClips]);

  // Handle bulk share
  const handleBulkShare = useCallback(() => {
    const clipsToShareList = selectMode && selectedClips.length > 0
      ? clips.filter(clip => selectedClips.includes(clip.id))
      : clips;

    setClipsToShare(clipsToShareList);
    setShareStoreClips(clipsToShareList);
    setShowShareModal(true);
  }, [clips, selectedClips, selectMode, setShareStoreClips]);

  // Handle share modal close
  const handleShareModalClose = useCallback(() => {
    setShowShareModal(false);
    setClipsToShare([]);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="border-border text-foreground hover:bg-muted/50 bg-transparent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Studio
          </Button>
          <h2 className="text-xl font-semibold text-foreground">
            Original clips ({clips.length})
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectMode && selectedClips.length === clips.length}
              onCheckedChange={() => {
                if (selectMode && selectedClips.length === clips.length) {
                  setSelectedClips([]);
                } else {
                  setSelectedClips(clips.map((clip) => clip.id));
                }
              }}
              className="w-4 h-4"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectMode}
              className="border-border text-foreground hover:bg-muted/50 bg-transparent"
            >
              Select
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDownload}
            className="border-border text-foreground hover:bg-muted/50 bg-transparent"
          >
            <Download className="w-4 h-4 mr-2" />
            {selectMode && selectedClips.length > 0
              ? `Bulk Download (${selectedClips.length})`
              : `Bulk Download (${clips.length})`
            }
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkShare}
            disabled={selectMode && selectedClips.length < 2}
            className="border-border text-foreground hover:bg-muted/50 bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Share2 className="w-4 h-4 mr-2" />
            {selectMode && selectedClips.length > 0
              ? `Bulk Share (${selectedClips.length})`
              : 'Bulk Share'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-border text-foreground hover:bg-muted/50 bg-transparent"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-border text-foreground hover:bg-muted/50 bg-transparent"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Clips Grid - More breathing space for larger cards */}
      <div className={`grid gap-6 mb-8 ${
        aspectRatio === "vertical" 
          ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" 
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      }`}>
        {clips.map((clip) => (
          <ClipCard
            key={clip.id}
            clip={clip}
            isSelected={selectedClips.includes(clip.id)}
            selectMode={selectMode}
            aspectRatio={aspectRatio}
            onClipSelect={(clipId) => {
              if (selectMode) {
                setSelectedClips((prev) =>
                  prev.includes(clipId)
                    ? prev.filter((id) => id !== clipId)
                    : [...prev, clipId]
                );
              } else {
                onClipSelect?.(clipId);
              }
            }}
            onShare={handleClipShare}
            onRemove={(clipId) => {
              // Handle remove functionality
            }}
            // NEW: Pass template state to ClipCard
            appliedTemplate={appliedTemplate}
            appliedSettings={appliedSettings}
            isTemplateApplied={isTemplateApplied}
            // Pass projectId for clip updates
            projectId={projectId}
            // Download progress handlers
            setIsDownloading={setIsDownloading}
            setDownloadProgress={setDownloadProgress}
          />
        ))}
      </div>

      {/* Download Progress Popup - Global for all clips */}
      <DownloadProgressPopup 
        isVisible={isDownloading} 
        progress={downloadProgress} 
      />

      {/* Bottom Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedClips.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedClips.length} clip{selectedClips.length !== 1 ? "s" : ""}{" "}
              selected
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="border-border text-foreground hover:bg-muted/50 bg-transparent"
          >
            Remove watermark
          </Button>
          <Button
            variant="outline"
            className="border-border text-foreground hover:bg-muted/50 bg-transparent"
          >
            Questions?
          </Button>
        </div>
      </div>

      {/* Template Floating Sidebar */}
      <TemplateFloatingSidebar
        selectedClips={selectedClips}
        projectId={projectId}
        onTemplateApply={handleTemplateApply}
        isApplying={isApplyingTemplate}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={handleShareModalClose}
        clips={clipsToShare}
        accounts={accounts}
        projectId={projectId}
      />

      {/* Share Progress Modal */}
      <ShareProgressModal />
    </div>
  );
});

export default ClipsGallery;
