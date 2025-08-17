"use client";

import { ArrowLeft, Filter, Download, MoreHorizontal } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import SkeletonClipCard from "./SkeletonClipCard";

export default function SkeletonClipsGallery({
  expectedClipCount = 8, // Default to 8 skeleton cards
  onBack,
  aspectRatio = "vertical", // "video" or "vertical"
  isProcessing = false,
}) {
  // Create array of skeleton items based on expected count
  const skeletonItems = Array.from({ length: expectedClipCount }, (_, i) => i);

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
          <div className="flex items-center gap-3">
            <div className="h-6 w-32 bg-gray-700/30 rounded animate-pulse" />
            {isProcessing && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm text-blue-400 animate-pulse">Processing clips...</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              disabled
              className="w-4 h-4 opacity-50"
            />
            <Button
              variant="outline"
              size="sm"
              disabled
              className="border-border text-muted-foreground bg-transparent opacity-50"
            >
              Select
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled
            className="border-border text-muted-foreground bg-transparent opacity-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Bulk Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled
            className="border-border text-muted-foreground bg-transparent opacity-50"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled
            className="border-border text-muted-foreground bg-transparent opacity-50"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Clips Grid Skeleton - More breathing space for larger cards */}
      <div className={`grid gap-6 mb-8 ${
        aspectRatio === "vertical" 
          ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" 
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      }`}>
        {skeletonItems.map((index) => (
          <SkeletonClipCard
            key={`skeleton-${index}`}
            aspectRatio={aspectRatio}
          />
        ))}
      </div>

      {/* Bottom Actions Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-4 w-24 bg-gray-700/30 rounded animate-pulse" />
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            disabled
            className="border-border text-muted-foreground bg-transparent opacity-50"
          >
            Remove watermark
          </Button>
          <Button
            variant="outline"
            disabled
            className="border-border text-muted-foreground bg-transparent opacity-50"
          >
            Questions?
          </Button>
        </div>
      </div>
    </div>
  );
}