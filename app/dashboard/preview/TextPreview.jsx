"use client";

import { useState, useContext } from "react";
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
import { usePostData } from "@/app/context/PostDataContext";
import { useMediaTextFlow } from "@/app/context/MediaTextFlowContext";

// --- Reusable Icon Components (Consider moving to a shared file) ---
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
// --- End Icon Components ---

export function TextPreview() {
  // --- Get Data from Contexts ---
  const { postData } = usePostData();
  const { behavior } = useMediaTextFlow();

  const { selectedAccounts: accounts, scheduleType, scheduledAt } = postData;
  const { temporaryText } = behavior;
  // -----------------------------

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

  // Grouping and Sorting Logic
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

  // --- Get Scheduled Date String --- //
  const getFormattedScheduledDate = () => {
    if (
      scheduleType === "scheduled" &&
      scheduledAt instanceof Date &&
      !isNaN(scheduledAt)
    ) {
      return scheduledAt.toLocaleDateString(undefined, {
        // Use user's locale
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } else if (scheduleType === "scheduled") {
      return "Invalid Date"; // Handle case where date is invalid
    }
    return "Immediate"; // Default if not scheduled
  };
  const displayDate = getFormattedScheduledDate();
  // --------------------------------- //

  return (
    <div>
      <div className="flex flex-col w-full max-w-[360px] rounded-3xl bg-muted/30 p-4 shadow-sm border">
        {/* Phone mockup container */}
        <div className="flex flex-col h-full rounded-xl overflow-hidden">
          {/* Text Content preview area - Reads temporaryText from context */}
          <div className="w-full min-h-[200px] bg-background p-3 text-sm leading-relaxed">
            <p className="whitespace-pre-wrap break-words">
              {temporaryText || (
                <span className="text-muted-foreground italic">
                  Type something...
                </span>
              )}
            </p>
          </div>

          {/* Social accounts Preview - Reads accounts from context */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 my-3 px-1">
            {accounts && accounts.length > 0 ? (
              sortedPlatforms.map((platform) => {
                const PlatformIconComponent = platformInfo[platform]?.icon;
                // Ensure the platform exists in platformInfo before rendering
                if (!PlatformIconComponent) {
                  console.warn(
                    `TextPreview: Icon not found for platform: ${platform}`
                  );
                  return null; // Skip rendering if icon is missing
                }
                return (
                  <div key={platform} className="flex items-center space-x-1.5">
                    <PlatformIconComponent className="w-4 h-4 text-muted-foreground" />
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
          {/* End Accounts Preview */}

          {/* Date display - Reads schedule from context */}
          <div className="flex justify-center mt-auto pt-3">
            <Button
              variant="secondary"
              size="sm"
              className="text-xs flex items-center gap-1 opacity-70"
            >
              <Calendar className="w-3 h-3" />
              <span>{displayDate}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
