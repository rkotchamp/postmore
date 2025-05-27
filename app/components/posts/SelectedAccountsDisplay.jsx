"use client";

import React from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import {
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Linkedin,
  AtSign,
} from "lucide-react";

// --- Icon Components (Copied from SelectAccount/Authenticate pages for consistency) ---
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

// Platform configuration with icons and colors
const platformConfig = {
  instagram: { icon: Instagram, name: "Instagram" },
  twitter: { icon: Twitter, name: "Twitter" },
  facebook: { icon: Facebook, name: "Facebook" },
  threads: { icon: AtSign, name: "Threads" },
  ytshorts: { icon: Youtube, name: "YouTube Shorts" },
  youtube: { icon: Youtube, name: "YouTube" },
  tiktok: { icon: TikTokIcon, name: "TikTok" },
  bluesky: { icon: BlueskyIcon, name: "Bluesky" },
  linkedin: { icon: Linkedin, name: "LinkedIn" },
};

const PlatformIcon = ({ platform, className }) => {
  const iconProps = { className: className || "h-5 w-5 text-muted-foreground" };
  switch (platform) {
    case "instagram":
      return <Instagram {...iconProps} />;
    case "twitter":
      return <Twitter {...iconProps} />;
    case "facebook":
      return <Facebook {...iconProps} />;
    case "threads":
      return (
        <div
          className={`${
            className || "h-5 w-5"
          } text-sm font-bold flex items-center justify-center text-muted-foreground`}
        >
          @
        </div>
      );
    case "ytShorts":
      return <Youtube {...iconProps} />;
    case "tiktok":
      return <TikTokIcon {...iconProps} />;
    case "bluesky":
      return <BlueskyIcon {...iconProps} />;
    default:
      return null;
  }
};
// --- End Icon Components ---

export function SelectedAccountsDisplay({ accounts }) {
  // Early return if no accounts provided
  if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">No accounts selected</div>
    );
  }

  // Group accounts by platform
  const groupedByPlatform = accounts.reduce((acc, account) => {
    const platform = account.platform || "other";
    if (!acc[platform]) {
      acc[platform] = [];
    }
    acc[platform].push(account);
    return acc;
  }, {});

  // Define the desired order of platforms
  const platformOrder = [
    "instagram",
    "twitter",
    "facebook",
    "threads",
    "ytShorts",
    "youtube",
    "tiktok",
    "bluesky",
  ];

  // Sort the platforms based on the defined order
  const sortedPlatforms = Object.keys(groupedByPlatform).sort((a, b) => {
    const indexA = platformOrder.indexOf(a);
    const indexB = platformOrder.indexOf(b);
    // Handle platforms not in the order list (put them at the end)
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {sortedPlatforms.map((platform) => (
        <div key={platform} className="flex items-center space-x-2">
          {/* Platform Icon - Circular background similar to image */}
          <div className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center">
            <PlatformIcon
              platform={platform}
              className="h-4 w-4 text-foreground"
            />
          </div>

          {/* Stacked Avatars */}
          <div className="flex items-center -space-x-2">
            {groupedByPlatform[platform].map((account, index) => {
              // Handle different avatar field names
              const avatarSrc =
                account.profileImage || account.avatar || account.imageUrl;
              // Handle different name field names
              const name =
                account.displayName ||
                account.name ||
                account.username ||
                "User";

              return (
                <Avatar
                  key={account._id || account.id || index}
                  className="h-7 w-7 border-2 border-background"
                  title={name}
                >
                  <AvatarImage src={avatarSrc} alt={name} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {name ? name.charAt(0).toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
