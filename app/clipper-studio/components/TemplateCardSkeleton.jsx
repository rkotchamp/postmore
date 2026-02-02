"use client";

/**
 * Skeleton loading component for template cards
 * Shows while video data is being fetched
 */
export function TemplateCardSkeleton({ className = "" }) {
  return (
    <div className={`relative p-4 border rounded-lg bg-muted/30 animate-pulse ${className}`}>
      {/* Template Preview Skeleton */}
      <div className="aspect-[9/16] w-full mb-3 rounded-md overflow-hidden bg-muted/50 relative">
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
        
        {/* Centered loading indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>

      {/* Template Info Skeleton */}
      <div className="space-y-2">
        {/* Template name skeleton */}
        <div className="h-4 bg-muted/50 rounded w-3/4" />
        
        {/* Default badge skeleton */}
        <div className="h-3 bg-muted/50 rounded w-1/3" />
      </div>
    </div>
  );
}

/**
 * Grid of template card skeletons
 * @param {number} count - Number of skeleton cards to show
 */
export function TemplateCardsSkeletonGrid({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <TemplateCardSkeleton key={`skeleton-${i}`} />
      ))}
    </div>
  );
}