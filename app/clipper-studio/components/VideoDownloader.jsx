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
  onClick,
  isClickable = false,
  thumbnailUrl, // Accept thumbnail URL as prop from database
  projectId, // Project ID for actions
  onDelete,
  onSave,
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
        {progress < 100 ? (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
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
            </div>
          </div>
        ) : null}

        {/* Status Badge */}
        <div className="absolute bottom-2 left-2">
          {progress < 100 ? (
            <Badge className="bg-orange-500/90 text-white border-0 text-xs">
              Processing
            </Badge>
          ) : (
            <Badge className="bg-red-500/90 text-white border-0 text-xs">
              Expired
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
