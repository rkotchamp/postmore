"use client";

import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { MoreVertical, Trash2, Save } from "lucide-react";
import { useState } from "react";

export default function ProcessingView({
  videoUrl,
  videoTitle = "Untitled Video",
  progress = 0,
  status = "processing",
  progressMessage, // NEW: GenZ progress message from backend
  onClick,
  isClickable = false,
  thumbnailUrl, // Accept thumbnail URL as prop from database
  projectId, // Project ID for actions
  onDelete,
  onSave,
  hasClips = false, // New prop to indicate if clips are available
  totalClips = 0, // New prop for clip count
  processedClips = 0, // New prop for processed clips count
}) {
  const [showMenu, setShowMenu] = useState(false);

  // Create fallback thumbnail if none provided
  const getFallbackThumbnail = () => {
    const svg = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#374151"/>
      <text x="150" y="100" text-anchor="middle" fill="white" font-family="Arial" font-size="16">Video Thumbnail</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // Use the thumbnailUrl prop (from Firebase) or fallback to data URL
  const displayThumbnail = thumbnailUrl || getFallbackThumbnail();


  return (
    <Card 
      className={`bg-card/80 backdrop-blur-sm border-border p-3 transition-colors relative ${
        isClickable ? 'cursor-pointer hover:bg-card/90' : ''
      }`}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Three-dot menu */}
      <div className="absolute bottom-3 right-3 z-10">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-2 hover:bg-white/90 dark:hover:bg-gray-800/90 rounded-full transition-colors bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 shadow-sm"
          >
            <MoreVertical className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </button>
          
          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 bottom-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-32">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onSave?.(projectId);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-t-lg"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onDelete?.(projectId);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-b-lg"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Video Thumbnail */}
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-900 mb-3">
        <img
          src={displayThumbnail}
          alt="Video thumbnail"
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target;
            target.src = getFallbackThumbnail();
          }}
        />

        {/* Progress Overlay */}
        {(progress < 100 && status !== 'failed' && status !== 'error' && status !== 'completed') ? (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center overflow-hidden">
            <div className="text-center">
              {/* Circular Progress */}
              <div className="relative w-12 h-12 mx-auto mb-2">
                <svg
                  className="w-12 h-12 transform -rotate-90"
                  viewBox="0 0 48 48"
                >
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="#10b981"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${
                      2 * Math.PI * 20 * (1 - progress / 100)
                    }`}
                    className="transition-all duration-500 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>
              {/* Animated laser line */}
              <div className="relative w-32 h-[2px] mx-auto mb-2 rounded-full bg-white/10">
                <div
                  className="absolute top-0 h-full w-10 rounded-full"
                  style={{
                    background: 'linear-gradient(to right, transparent, #a855f7, #c084fc, #a855f7, transparent)',
                    boxShadow: '0 0 8px 2px rgba(168, 85, 247, 0.5)',
                    animation: 'laserSlide 1.8s ease-in-out infinite',
                  }}
                />
              </div>
              {/* Status Text */}
              <p className="text-white text-xs opacity-90">
                {progressMessage || (
                  status === 'downloading' ? 'getting the sauce' :
                  status === 'transcribing' ? 'reading the vibes' :
                  status === 'analyzing' ? 'hunting viral moments' :
                  status === 'cutting' ? 'snipping the clips' :
                  status === 'saving' ? 'saving your W\'s' :
                  status === 'completed' ? 'WE DID THAT!' :
                  'we\'re cooking'
                )}
              </p>
            </div>
            <style jsx>{`
              @keyframes laserSlide {
                0% { left: -10px; }
                50% { left: calc(100% - 30px); }
                100% { left: -10px; }
              }
            `}</style>
          </div>
        ) : (status === 'failed' || status === 'error') ? (
          <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center">
            <div className="text-center px-3">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-red-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-white text-xs opacity-90 line-clamp-2">
                {progressMessage || 'Something went wrong. Please try again.'}
              </p>
            </div>
          </div>
        ) : null}

        {/* Status Badge */}
        <div className="absolute bottom-2 left-2">
          {status === 'downloading' ? (
            <Badge className="bg-blue-500/90 text-white border-0 text-xs">
              Downloading
            </Badge>
          ) : status === 'transcribing' ? (
            <Badge className="bg-purple-500/90 text-white border-0 text-xs">
              Transcribing
            </Badge>
          ) : status === 'analyzing' ? (
            <Badge className="bg-indigo-500/90 text-white border-0 text-xs">
              Analyzing
            </Badge>
          ) : status === 'saving' ? (
            <Badge className="bg-green-500/90 text-white border-0 text-xs">
              Saving
            </Badge>
          ) : status === 'completed' && hasClips && processedClips > 0 ? (
            <Badge className="bg-green-500/90 text-white border-0 text-xs">
              {processedClips} Clip{processedClips !== 1 ? 's' : ''} Ready
            </Badge>
          ) : status === 'completed' ? (
            <Badge className="bg-blue-500/90 text-white border-0 text-xs">
              Ready
            </Badge>
          ) : status === 'processing' || (hasClips && totalClips > 0 && processedClips === 0) ? (
            <Badge className="bg-orange-500/90 text-white border-0 text-xs">
              Processing
            </Badge>
          ) : (status === 'failed' || status === 'error') ? (
            <Badge className="bg-red-500/90 text-white border-0 text-xs">
              Failed
            </Badge>
          ) : (
            <Badge className="bg-gray-500/90 text-white border-0 text-xs">
              Unknown
            </Badge>
          )}
        </div>
      </div>

      {/* Video Title */}
      <div className="space-y-1">
        <h3 className="font-medium text-sm text-foreground line-clamp-2 leading-tight">
          {videoTitle}
        </h3>
        <p className="text-xs text-muted-foreground">ClipBasic</p>
      </div>
    </Card>
  );
}
