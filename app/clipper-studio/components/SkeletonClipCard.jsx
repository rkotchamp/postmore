"use client";

export default function SkeletonClipCard({ aspectRatio = "video" }) {
  // Dynamic classes - match ClipCard sizing
  const aspectClass = aspectRatio === "vertical" ? "aspect-[9/16]" : "aspect-video";
  const cardClasses = aspectRatio === "vertical" 
    ? "w-full max-w-[400px]" 
    : "w-full max-w-[560px]";

  return (
    <div className={`${cardClasses} bg-transparent border border-transparent overflow-hidden rounded-2xl px-4 py-4 animate-pulse`}>
      {/* Video Preview Skeleton - Main focus like reference */}
      <div className={`relative ${aspectClass} bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-xl overflow-hidden mb-3 shadow-lg`}>
        {/* Bokeh gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-800/10 to-pink-900/10" />
        
        {/* Animated bokeh circles */}
        <div className="absolute top-1/4 left-1/4 w-16 h-16 bg-blue-500/5 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-3/4 right-1/4 w-12 h-12 bg-purple-500/5 rounded-full blur-xl animate-pulse delay-300" />
        <div className="absolute bottom-1/4 left-1/3 w-10 h-10 bg-pink-500/5 rounded-full blur-xl animate-pulse delay-700" />
        
        {/* Subtle shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-shimmer" />
        
        {/* Duration Badge Skeleton - Always visible like reference */}
        <div className={`absolute top-3 right-3 bg-gray-700/50 rounded-md ${
          aspectRatio === "vertical" ? "w-12 h-5" : "w-16 h-6"
        }`} />
        
        {/* Loading indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
            <div className="w-16 h-3 bg-gray-600/50 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content Section Skeleton - More breathing space */}
      <div className="px-2">
        {/* Title Skeleton */}
        <div className="mb-3">
          <div className={`bg-gray-700/30 rounded ${
            aspectRatio === "vertical" ? "h-4 mb-1" : "h-5 mb-1"
          }`} />
          <div className={`bg-gray-700/20 rounded w-3/4 ${
            aspectRatio === "vertical" ? "h-4" : "h-5"
          }`} />
        </div>

        {/* Action Buttons Skeleton - Cleaner spacing */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${aspectRatio === "vertical" ? "gap-2" : "gap-3"}`}>
            <div className={`bg-gray-700/30 rounded ${
              aspectRatio === "vertical" ? "h-8 w-8" : "h-9 w-9"
            }`} />
            <div className={`bg-gray-700/30 rounded ${
              aspectRatio === "vertical" ? "h-8 w-8" : "h-9 w-9"
            }`} />
          </div>
          <div className={`bg-gray-700/30 rounded ${
            aspectRatio === "vertical" ? "h-8 w-8" : "h-9 w-9"
          }`} />
        </div>
      </div>
    </div>
  );
}