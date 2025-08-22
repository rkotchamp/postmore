"use client";

import { useState } from "react";
import {
  Filter,
  MoreHorizontal,
  ArrowLeft,
  Download,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import ClipCard from "./ClipCard";
import TemplateFloatingSidebar from "./TemplateFloatingSidebar";

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

export default function ClipsGallery({
  clips = defaultClips,
  onClipSelect,
  onBack,
  aspectRatio = "vertical", // "video" or "vertical"
}) {
  const [selectedClips, setSelectedClips] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  // Moved handleClipSelect logic into the ClipCard component for better encapsulation

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) {
      setSelectedClips([]);
    }
  };

  const handleBulkDownload = async () => {
    const clipsToDownload = selectMode && selectedClips.length > 0 
      ? clips.filter(clip => selectedClips.includes(clip.id))
      : clips;

    console.log(`📦 [BULK-DOWNLOAD] Starting bulk download of ${clipsToDownload.length} clips`);

    for (let i = 0; i < clipsToDownload.length; i++) {
      const clip = clipsToDownload[i];
      if (clip.videoUrl) {
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
          console.error(`❌ [BULK-DOWNLOAD] Failed to download clip: ${clip.title}`, error);
          // Fallback to opening in new tab
          window.open(clip.videoUrl, '_blank');
        }
        
        // Small delay between downloads to avoid overwhelming the browser
        if (i < clipsToDownload.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    console.log(`✅ [BULK-DOWNLOAD] Bulk download completed`);
  };

  const handleTemplateApply = async (templateData) => {
    setIsApplyingTemplate(true);
    
    try {
      console.log('🎨 [TEMPLATE-APPLY] Starting template application:', templateData);
      
      // TODO: Call template application API
      // For now, just simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success message
      console.log('✅ [TEMPLATE-APPLY] Template applied successfully');
      
      // Optionally refresh clips or update UI state
      
    } catch (error) {
      console.error('❌ [TEMPLATE-APPLY] Failed to apply template:', error);
      // TODO: Show error toast/notification
    } finally {
      setIsApplyingTemplate(false);
    }
  };

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
            onShare={(clip) => {
              // Handle share functionality
              console.log('Sharing clip:', clip.title);
            }}
            onRemove={(clipId) => {
              // Handle remove functionality
              console.log('Removing clip:', clipId);
            }}
          />
        ))}
      </div>

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
        onTemplateApply={handleTemplateApply}
        isApplying={isApplyingTemplate}
      />
    </div>
  );
}
