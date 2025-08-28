"use client";

import React from "react";
import { Download } from "lucide-react";

export default function DownloadProgressPopup({ isVisible, progress }) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-lg p-6 shadow-2xl max-w-sm w-full mx-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Spinning Download Icon */}
          <div className="relative">
            {/* Spinning border around icon */}
            <div className="animate-spin rounded-full h-16 w-16 border-2 border-transparent border-t-primary border-r-primary"></div>
            {/* Download icon in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="p-3 bg-primary/10 rounded-full">
                <Download className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
          
          {/* Progress Text */}
          <div className="text-center">
            <h3 className="font-semibold text-foreground mb-2 text-lg">Downloading Video</h3>
            <p className="text-sm text-muted-foreground">{progress}</p>
          </div>
        </div>
      </div>
    </div>
  );
}