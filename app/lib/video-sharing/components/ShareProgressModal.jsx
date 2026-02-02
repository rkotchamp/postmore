"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Share2 } from "lucide-react";
import { useShareStore } from "@/app/lib/store/shareStore";

export function ShareProgressModal() {
  const {
    showProgressModal,
    isSharing,
    shareProgress,
    resetShareState,
  } = useShareStore();

  const [progressMessage, setProgressMessage] = useState("Getting ready...");
  const { total, completed } = shareProgress;

  // Dynamic progress messages
  useEffect(() => {
    if (!isSharing) {
      setProgressMessage("All done!");
      return;
    }

    const percentage = total > 0 ? (completed / total) * 100 : 0;

    if (percentage === 0) {
      setProgressMessage("Preparing your content...");
    } else if (percentage < 40) {
      setProgressMessage("Adding your style and captions...");
    } else if (percentage < 80) {
      setProgressMessage("Getting everything ready...");
    } else if (percentage < 100) {
      setProgressMessage("Almost there...");
    } else {
      setProgressMessage("All done!");
    }
  }, [isSharing, completed, total]);

  // Don't auto-close - wait for user to click "All done!" button

  // Handle modal close - fully reset the share state
  const handleClose = () => {
    // Only allow closing if not currently sharing
    if (!isSharing) {
      // Reset the entire share state (closes both modals, resets step to 'accounts', clears all selections)
      resetShareState();
    }
  };

  return (
    <Dialog open={showProgressModal} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => isSharing && e.preventDefault()}
        onEscapeKeyDown={(e) => isSharing && e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>Sharing Progress</DialogTitle>
        </VisuallyHidden>

        <div className="flex flex-col items-center justify-center py-12 px-6">
          {/* Orbiting Spinner around Share Icon */}
          <div className="relative w-32 h-32 mb-8">
            {/* Share Icon in Center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`rounded-full bg-primary/10 p-6 ${!isSharing && 'bg-green-500/10'}`}>
                <Share2 className={`w-12 h-12 ${isSharing ? 'text-primary' : 'text-green-500'}`} />
              </div>
            </div>

            {/* Orbiting Spinner */}
            {isSharing && (
              <div className="absolute inset-0 animate-spin">
                <div className="relative w-full h-full">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full"></div>
                </div>
              </div>
            )}

            {/* Success Check Mark */}
            {!isSharing && completed > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute top-0 right-0 bg-green-500 rounded-full p-2 shadow-lg animate-in zoom-in duration-300">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Progress Message */}
          <div className="text-center space-y-3 max-w-sm">
            {!isSharing && completed > 0 ? (
              <button
                onClick={handleClose}
                className="text-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-all px-8 py-3 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
              >
                {progressMessage}
              </button>
            ) : (
              <p className="text-lg font-semibold text-foreground">
                {progressMessage}
              </p>
            )}

            {/* Subtle progress indicator */}
            {isSharing && total > 0 && (
              <p className="text-sm text-muted-foreground">
                {completed} of {total} {completed === 1 ? 'post' : 'posts'} processed
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
