"use client";

import { useState } from "react";
import { Badge } from "@/app/components/ui/badge";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import {
  Instagram,
  Twitter,
  Facebook,
  AtSign,
  Youtube,
  Calendar,
} from "lucide-react";

const TikTokIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M19.321 5.562a5.124 5.124 0 0 1-5.16-4.956h-3.364v14.88c0 1.767-1.436 3.204-3.204 3.204a3.204 3.204 0 0 1-3.204-3.204 3.204 3.204 0 0 1 3.204-3.204c.282 0 .553.044.813.116v-3.364a6.552 6.552 0 0 0-.813-.052A6.568 6.568 0 0 0 1.025 15.55 6.568 6.568 0 0 0 7.593 22.12a6.568 6.568 0 0 0 6.568-6.568V9.658a8.464 8.464 0 0 0 5.16 1.752v-3.364a5.113 5.113 0 0 1-3.137-1.053 5.177 5.177 0 0 1-1.602-2.084V4.9"
      fill="currentColor"
    />
  </svg>
);

const BlueskyIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" />
    <path d="M17 12c0 2.8-2.2 5-5 5s-5-2.2-5-5 2.2-5 5-5 5 2.2 5 5Z" />
    <path d="M12 7v0" />
  </svg>
);

export function Preview({ content, accounts = [], captions }) {
  // Platform display names and icons
  const platformInfo = {
    instagram: { name: "Instagram", icon: Instagram },
    twitter: { name: "Twitter", icon: Twitter },
    facebook: { name: "Facebook", icon: Facebook },
    threads: { name: "Threads", icon: AtSign },
    ytShorts: { name: "YouTube Shorts", icon: Youtube },
    tiktok: { name: "TikTok", icon: TikTokIcon },
    bluesky: { name: "Bluesky", icon: BlueskyIcon },
  };

  // Grouping and Sorting Logic from SelectedAccountsPreview
  const groupedByPlatform = accounts.reduce((acc, account) => {
    const platform = account.platform;
    if (!acc[platform]) {
      acc[platform] = [];
    }
    acc[platform].push(account);
    return acc;
  }, {});

  const platformOrder = [
    "instagram",
    "twitter",
    "facebook",
    "threads",
    "ytShorts",
    "tiktok",
    "bluesky",
  ];

  const sortedPlatforms = Object.keys(groupedByPlatform).sort((a, b) => {
    const indexA = platformOrder.indexOf(a);
    const indexB = platformOrder.indexOf(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

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

          {/* Social accounts - Updated Preview */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 my-3">
            {accounts && accounts.length > 0 ? (
              sortedPlatforms.map((platform) => {
                const PlatformIconComponent = platformInfo[platform]?.icon;
                return (
                  <div key={platform} className="flex items-center space-x-1.5">
                    {PlatformIconComponent && (
                      <PlatformIconComponent className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div className="flex items-center -space-x-2">
                      {groupedByPlatform[platform].map((account, index) => (
                        <Avatar
                          key={account.id || index}
                          className="h-5 w-5 border border-background"
                          title={account.name}
                        >
                          <AvatarImage
                            src={account.imageUrl}
                            alt={account.name}
                          />
                          <AvatarFallback className="text-[10px]">
                            {account.name?.charAt(0)?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-muted-foreground ml-1">
                No accounts selected
              </div>
            )}
          </div>
          {/* End Updated Preview */}

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
