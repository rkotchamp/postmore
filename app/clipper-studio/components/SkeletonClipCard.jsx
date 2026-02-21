"use client";

export default function SkeletonClipCard({ aspectRatio = "video" }) {
  // Dynamic classes - match ClipCard sizing
  const aspectClass = aspectRatio === "vertical" ? "aspect-[9/16]" : "aspect-video";
  const cardClasses = aspectRatio === "vertical" 
    ? "w-full max-w-[400px]" 
    : "w-full max-w-[560px]";

  return (
    <div className={`${cardClasses} bg-transparent border border-transparent overflow-hidden rounded-2xl px-4 py-4 animate-pulse`}>
      {/* Video Preview Skeleton — matches real ClipCard no-video state */}
      <div className={`relative ${aspectClass} bg-muted rounded-xl overflow-hidden mb-3 shadow-lg`}>
        {/* Duration badge — top-right, matches real card */}
        <div className={`absolute top-3 right-3 bg-muted-foreground/20 rounded-md ${
          aspectRatio === "vertical" ? "w-12 h-5" : "w-16 h-6"
        }`} />

        {/* Centered loading pulse — matches real card "processing" state */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-background/40 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border/30">
            <div className="w-16 h-3 bg-muted-foreground/30 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content Section Skeleton - More breathing space */}
      <div className="px-2">
        {/* Title skeleton — mirrors real ClipCard: line-clamp-2 font-semibold text-sm/base */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <div className={`bg-muted-foreground/20 rounded w-full ${
              aspectRatio === "vertical" ? "h-4" : "h-5"
            }`} />
            <div className={`bg-muted-foreground/15 rounded w-3/4 ${
              aspectRatio === "vertical" ? "h-4" : "h-5"
            }`} />
          </div>
          {/* Edit icon placeholder */}
          <div className="h-3 w-3 bg-muted-foreground/10 rounded flex-shrink-0 mt-0.5" />
        </div>

        {/* Action row — mirrors real ClipCard: virality score left, 2 buttons right */}
        <div className="flex items-center justify-between">
          {/* Virality score placeholder */}
          <div className="flex items-center gap-1">
            <div className="h-3 w-10 bg-muted-foreground/20 rounded" />
            <div className="h-3 w-6 bg-muted-foreground/20 rounded" />
          </div>
          {/* Download + Share buttons */}
          <div className={`flex items-center ${aspectRatio === "vertical" ? "gap-2" : "gap-3"}`}>
            <div className={`bg-muted-foreground/20 rounded border border-border/30 ${
              aspectRatio === "vertical" ? "h-8 w-8" : "h-9 w-9"
            }`} />
            <div className={`bg-muted-foreground/20 rounded border border-border/30 ${
              aspectRatio === "vertical" ? "h-8 w-8" : "h-9 w-9"
            }`} />
          </div>
        </div>
      </div>
    </div>
  );
}