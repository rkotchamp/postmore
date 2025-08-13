"use client";

import { useState } from "react";
import { Upload, Info } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Card } from "@/app/components/ui/card";

export default function VideoPreview({ videoUrl, onRemove, onProcess }) {
  const [language, setLanguage] = useState("English");
  const [isProcessing, setIsProcessing] = useState(false);

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
    : null;

  const handleProcess = () => {
    setIsProcessing(true);
    onProcess();
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 space-y-3">
      {/* URL Display with Remove Button */}
      <Card className="bg-card/80 backdrop-blur-sm border-border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm text-muted-foreground truncate">
              {videoUrl}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRemove}
            className="ml-4 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-transparent"
          >
            Remove
          </Button>
        </div>
      </Card>

      {/* Processing Options */}
      <Card className="bg-card/80 backdrop-blur-sm border-border p-4">
        <div className="space-y-3">
          {/* Options Row */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-transparent"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload .SRT
            </Button>
          </div>

          {/* Video Thumbnail - Balanced Size */}
          <div className="relative">
            <div className="relative h-32 rounded-lg overflow-hidden bg-gray-800">
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Preview</p>
                </div>
              </div>

              {/* Quality Badge */}
              <div className="absolute top-2 left-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-medium">
                4K
              </div>

              {/* Play Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[6px] border-y-transparent ml-1"></div>
                </div>
              </div>

              {/* Processing Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm">Analyzing...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Process Button */}
          <Button
            onClick={handleProcess}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                Processing clips...
              </div>
            ) : (
              "Start Processing"
            )}
          </Button>

          {/* Copyright Notice */}
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Using video you don't own may violate copyright laws. By continuing,
            you confirm this is your own original content.
          </p>
        </div>
      </Card>
    </div>
  );
}
