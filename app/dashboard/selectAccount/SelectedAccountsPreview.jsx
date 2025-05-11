"use client";

import React from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { Instagram, Twitter, Facebook, Youtube } from "lucide-react";
import { usePostStore } from "@/app/lib/store/postStore";

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

const PlatformIcon = ({ platform }) => {
  const iconProps = { className: "h-5 w-5 text-muted-foreground" }; // Added text-muted-foreground
  switch (platform) {
    case "instagram":
      return <Instagram {...iconProps} />;
    case "twitter":
      return <Twitter {...iconProps} />;
    case "facebook":
      return <Facebook {...iconProps} />;
    case "threads":
      return (
        <div className="h-5 w-5 text-sm font-bold flex items-center justify-center text-muted-foreground">
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

export function SelectedAccountsPreview() {
  // --- Get Data from Zustand Store ---
  const selectedAccounts = usePostStore((state) => state.selectedAccounts);
  // ---------------------------------

  // Group selected accounts by platform
  const groupedByPlatform = selectedAccounts.reduce((acc, account) => {
    const platform = account.platform;
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

  // Condition based on store data
  if (!selectedAccounts || selectedAccounts.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Select accounts to preview them here.
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-background shadow-sm">
      <p className="text-sm font-medium mb-3 text-foreground">
        Selected Accounts:
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {sortedPlatforms.map((platform) => (
          <div key={platform} className="flex items-center space-x-2">
            {/* Platform Icon */}
            <PlatformIcon platform={platform} />

            {/* Stacked Avatars */}
            <div className="flex items-center -space-x-2">
              {groupedByPlatform[platform].map((account, index) => (
                <Avatar
                  key={account.id || index} // Use account.id if available, fallback to index
                  className="h-6 w-6 border-2 border-background" // Added border for better visibility
                  title={account.name} // Add tooltip for name
                >
                  <AvatarImage src={account.imageUrl} alt={account.name} />
                  <AvatarFallback className="text-xs">
                    {account.name?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
