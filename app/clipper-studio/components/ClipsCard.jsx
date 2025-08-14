"use client";

import { useState } from "react";
import {
  Play,
  Download,
  Share2,
  X,
  Filter,
  MoreHorizontal,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Checkbox } from "@/app/components/ui/checkbox";

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
}) {
  const [selectedClips, setSelectedClips] = useState([]);
  const [selectMode, setSelectMode] = useState(false);

  const handleClipSelect = (clipId) => {
    if (selectMode) {
      setSelectedClips((prev) =>
        prev.includes(clipId)
          ? prev.filter((id) => id !== clipId)
          : [...prev, clipId]
      );
    } else {
      onClipSelect?.(clipId);
    }
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) {
      setSelectedClips([]);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
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
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectMode}
            className="border-border text-foreground hover:bg-muted/50 bg-transparent"
          >
            <Checkbox
              checked={selectMode && selectedClips.length === clips.length}
              onCheckedChange={() => {
                if (selectMode && selectedClips.length === clips.length) {
                  setSelectedClips([]);
                } else {
                  setSelectedClips(clips.map((clip) => clip.id));
                }
              }}
              className="w-4 h-4 mr-2"
            />
            Select
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

      {/* Clips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {clips.map((clip) => (
          <Card
            key={clip.id}
            className={`bg-card/80 backdrop-blur-sm border-border overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
              selectedClips.includes(clip.id) ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => handleClipSelect(clip.id)}
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gray-900">
              <img
                src={clip.thumbnail || "/placeholder.svg"}
                alt={clip.title}
                className="w-full h-full object-cover"
              />

              {/* Duration Badge */}
              <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-medium">
                {clip.timestamp} {clip.duration}
              </div>

              {/* Pro Badge */}
              {clip.isPro && (
                <Badge className="absolute top-2 left-2 bg-white text-black text-xs font-medium">
                  Pro
                </Badge>
              )}

              {/* Play Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-6 h-6 text-white ml-1" />
                </div>
              </div>

              {/* Selection Checkbox */}
              {selectMode && (
                <div className="absolute top-2 left-2">
                  <Checkbox
                    checked={selectedClips.includes(clip.id)}
                    onCheckedChange={() => handleClipSelect(clip.id)}
                    className="bg-white border-white"
                  />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-medium text-foreground text-sm line-clamp-2 mb-3">
                {clip.title}
              </h3>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-border hover:bg-muted/50 bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle download
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-border hover:bg-muted/50 bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle share
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-border hover:bg-muted/50 hover:text-destructive bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle remove
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
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
    </div>
  );
}
