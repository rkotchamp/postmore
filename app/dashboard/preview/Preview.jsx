"use client";

import { useState } from "react";
import { Badge } from "@/app/components/ui/badge";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import {
  Instagram,
  Twitter,
  Facebook,
  AtSign,
  Youtube,
  Calendar,
} from "lucide-react";

export function Preview({ content, accounts, captions }) {
  // Platform display names and icons
  const platformInfo = {
    instagram: { name: "Instagram", icon: Instagram },
    twitter: { name: "Twitter", icon: Twitter },
    facebook: { name: "Facebook", icon: Facebook },
    threads: { name: "Threads", icon: AtSign },
    youtube: { name: "YouTube", icon: Youtube },
  };

  // Default scheduled date is tomorrow
  const [scheduledDate, setScheduledDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });

  // Get active platforms from accounts
  const activePlatforms = [
    ...new Set(accounts.map((account) => account.platform)),
  ];

  // Get the appropriate caption for display
  const getCaption = () => {
    // If no captions or platforms, return empty string
    if (
      !captions ||
      Object.keys(captions).length === 0 ||
      activePlatforms.length === 0
    ) {
      return "";
    }

    // Just return the caption for the first platform for simplicity
    // In a real app, you might want to show platform-specific captions
    return captions[activePlatforms[0]] || "";
  };

  // Get preview media based on content type
  const getPreviewMedia = () => {
    if (!content || !content.data) return null;

    if (content.type === "media" && content.data.media) {
      return (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          {content.data.media ? (
            <img
              src={content.data.media}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-muted-foreground">No media selected</div>
          )}
        </div>
      );
    } else if (content.type === "text" && content.data.text) {
      return (
        <div className="w-full h-full bg-muted flex items-center justify-center p-4">
          <div className="text-center">{content.data.text}</div>
        </div>
      );
    } else if (content.type === "carousel" && content.data.carousel) {
      return (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          {content.data.carousel[0] ? (
            <img
              src={content.data.carousel[0]}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-muted-foreground">No carousel items</div>
          )}
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <div className="text-muted-foreground">No content selected</div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-col w-full max-w-[360px] rounded-3xl bg-muted/30 p-4 shadow-sm">
        {/* Phone mockup container */}
        <div className="flex flex-col h-full rounded-xl overflow-hidden">
          {/* Content preview area */}
          <div className="w-full aspect-[4/5] bg-gray-200">
            {getPreviewMedia()}
          </div>

          {/* Social accounts */}
          <div className="flex items-center gap-1 my-3">
            <span className="text-xs text-muted-foreground mr-1">
              Selected Accounts:
            </span>
            <div className="flex gap-1">
              {accounts && accounts.length > 0 ? (
                accounts.slice(0, 5).map((account, index) => {
                  const PlatformIcon =
                    platformInfo[account.platform]?.icon || Instagram;
                  return (
                    <div
                      key={index}
                      className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center"
                      title={`${account.name} (${
                        platformInfo[account.platform]?.name || account.platform
                      })`}
                    >
                      <PlatformIcon className="w-3 h-3" />
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-muted-foreground">
                  No accounts selected
                </div>
              )}

              {accounts && accounts.length > 5 && (
                <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-xs">+{accounts.length - 5}</span>
                </div>
              )}
            </div>
          </div>

          {/* Caption preview */}
          <div className="w-full h-24 bg-gray-300 mb-3 p-2 rounded overflow-y-auto">
            <p className="text-xs line-clamp-6">{getCaption()}</p>
          </div>

          {/* Date selector */}
          <div className="flex justify-center">
            <Button
              variant="secondary"
              size="sm"
              className="text-xs flex items-center gap-1"
            >
              <Calendar className="w-3 h-3" />
              <span>Selected Date: {scheduledDate}</span>
            </Button>
          </div>
        </div>

        {/* Thumbnail selector */}
      </div>
      <div className="mt-4">
        <Button variant="secondary" className="w-full">
          Select Cover Image/Thumbnail
        </Button>
      </div>
    </div>
  );
}
