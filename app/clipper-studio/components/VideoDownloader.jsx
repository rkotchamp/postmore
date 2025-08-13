"use client";

import { useState, useEffect } from "react";
import { Card } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";

export default function ProcessingView({
  videoUrl,
  videoTitle = "Untitled Video",
  onProcessingComplete,
}) {
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(5);

  // Simulate progress updates
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          // Trigger completion after a short delay
          setTimeout(() => {
            onProcessingComplete?.();
          }, 1000);
          return 100;
        }
        const increment = Math.random() * 3 + 1;
        const newProgress = Math.min(prev + increment, 100);

        // Update ETA based on progress
        const remainingTime = Math.max(Math.ceil((100 - newProgress) / 20), 0);
        setEta(remainingTime);

        return newProgress;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [onProcessingComplete]);

  // Extract video ID from YouTube URL for thumbnail
  const getYouTubeVideoId = (url) => {
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
    );
    return match ? match[1] : null;
  };

  const videoId = getYouTubeVideoId(videoUrl);
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    : "/placeholder.svg?height=200&width=300&text=Video+Thumbnail";

  const formatETA = (minutes) => {
    if (minutes === 0) return "Almost done";
    if (minutes === 1) return "ETA 1m";
    return `ETA ${minutes}m`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* AI Features Section */}
      <div className="mb-12">
        <div className="flex flex-wrap justify-center gap-8 mb-8">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <span className="text-white text-xl">✨</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Long to shorts
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">CC</span>
            </div>
            <span className="text-sm text-muted-foreground">AI Captions</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25z" />
              </svg>
            </div>
            <span className="text-sm text-muted-foreground">Video editor</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <span className="text-sm text-muted-foreground">
              Enhance speech
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
              </svg>
            </div>
            <span className="text-sm text-muted-foreground">AI Reframe</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
              </svg>
            </div>
            <span className="text-sm text-muted-foreground">AI B-Roll</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
              <span className="text-white text-xl">🎣</span>
            </div>
            <span className="text-sm text-muted-foreground">AI hook</span>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="space-y-6">
        {/* Project Tabs */}
        <div className="flex gap-6">
          <button className="text-foreground font-medium border-b-2 border-primary pb-2">
            All projects (1)
          </button>
          <button className="text-muted-foreground hover:text-foreground pb-2">
            Saved projects (0)
          </button>
        </div>

        {/* Processing Video Card */}
        <Card
          className="bg-card/80 backdrop-blur-sm border-border p-4 cursor-pointer hover:bg-card/90 transition-colors"
          onClick={() => progress === 100 && onProcessingComplete?.()}
        >
          <div className="flex gap-4">
            {/* Video Thumbnail with Progress */}
            <div className="relative flex-shrink-0">
              <div className="w-48 h-32 rounded-lg overflow-hidden bg-gray-900 relative">
                <img
                  src={thumbnailUrl || "/placeholder.svg"}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target;
                    target.src =
                      "/placeholder.svg?height=128&width=192&text=Video+Preview";
                  }}
                />

                {/* Progress Overlay */}
                {progress < 100 ? (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center">
                      {/* Circular Progress */}
                      <div className="relative w-16 h-16 mx-auto mb-2">
                        <svg
                          className="w-16 h-16 transform -rotate-90"
                          viewBox="0 0 64 64"
                        >
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="4"
                            fill="none"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="#10b981"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 28}`}
                            strokeDashoffset={`${
                              2 * Math.PI * 28 * (1 - progress / 100)
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

                      {/* Progress Badge */}
                      <Badge className="bg-green-500/90 text-white border-0 text-xs">
                        {Math.round(progress)}% ({formatETA(eta)})
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Badge className="bg-green-500 text-white border-0 text-sm">
                      ✓ Complete - Click to view clips
                    </Badge>
                  </div>
                )}

                {/* Quality Badge */}
                <div className="absolute top-2 left-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-medium">
                  4K
                </div>
              </div>
            </div>

            {/* Video Info */}
            <div className="flex-1 min-w-0">
              <div className="space-y-2">
                <h3 className="font-medium text-foreground truncate">
                  {videoTitle.length > 50
                    ? `${videoTitle.substring(0, 50)}...`
                    : videoTitle}
                </h3>
                <p className="text-sm text-muted-foreground">ClipBase</p>
                <Badge variant="outline" className="text-xs">
                  Free Plan
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
