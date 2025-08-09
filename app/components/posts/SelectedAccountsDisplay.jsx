"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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

// Get platform display name
const getPlatformName = (platform) => {
  const normalizedPlatform = platform?.toLowerCase();
  return platformConfig[normalizedPlatform]?.name || platform;
};

const PlatformIcon = ({ platform, className }) => {
  const iconProps = { className: className || "h-5 w-5 text-muted-foreground" };
  const normalizedPlatform = platform?.toLowerCase();
  
  switch (normalizedPlatform) {
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
    case "ytshorts":
    case "youtube":
      return <Youtube {...iconProps} />;
    case "tiktok":
      return <TikTokIcon {...iconProps} />;
    case "bluesky":
      return <BlueskyIcon {...iconProps} />;
    case "linkedin":
      return <Linkedin {...iconProps} />;
    default:
      return null;
  }
};
// --- End Icon Components ---

// Enhanced Popover Component with Portal and Arrow
const AccountPopover = ({ platform, accounts, isOpen, onClose, triggerRef }) => {
  const popoverRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, arrowLeft: 0 });

  // Calculate popover position
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      
      
      // For fixed positioning, use getBoundingClientRect directly (no scroll offset needed)
      let top = triggerRect.bottom + 8; // 8px gap below trigger
      let left = triggerRect.left;
      
      // Calculate arrow position (center of trigger)
      let arrowLeft = triggerRect.width / 2;
      
      // Adjust for viewport boundaries when we create the popover element
      setTimeout(() => {
        if (popoverRef.current) {
          const popoverRect = popoverRef.current.getBoundingClientRect();
          
          // Adjust horizontal position if popover would go off screen
          if (triggerRect.left + popoverRect.width > window.innerWidth - 16) {
            // Position to the left of trigger
            left = triggerRect.right - popoverRect.width;
            arrowLeft = popoverRect.width - (triggerRect.width / 2);
          }
          
          // Ensure minimum left position
          if (left < 16) {
            const adjustment = 16 - left;
            left = 16;
            arrowLeft = Math.max(12, arrowLeft - adjustment);
          }
          
          // Adjust vertical position if needed (above trigger if no space below)
          if (triggerRect.bottom + popoverRect.height > window.innerHeight - 16) {
            top = triggerRect.top - popoverRect.height - 8;
          }
          
          setPosition({ top, left, arrowLeft });
        }
      }, 0);
    }
  }, [isOpen, triggerRef, platform]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target) &&
          triggerRef.current && !triggerRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  // Close on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const platformName = getPlatformName(platform);

  const popoverContent = (
    <div
      ref={popoverRef}
      className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 min-w-[220px] max-w-[280px]"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Arrow pointing to trigger */}
      <div
        className="absolute -top-2 w-4 h-4 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 rotate-45"
        style={{
          left: Math.max(12, Math.min(position.arrowLeft - 8, 220 - 20)), // Constrain arrow position
        }}
      />
      
      {/* Content */}
      <div className="relative">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          Posted to {platformName} accounts
        </div>
        <div className="space-y-2.5">
          {accounts.map((account, index) => {
            const avatarSrc = account.profileImage || account.avatar || account.imageUrl;
            const name = account.displayName || account.name || account.username || "User";
            
            return (
              <div key={account._id || account.id || index} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <PlatformIcon platform={platform} className="h-4 w-4" />
                </div>
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarImage src={avatarSrc} alt={name} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {name ? name.charAt(0).toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate min-w-0">
                  {name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(popoverContent, document.body);
};

export function SelectedAccountsDisplay({ accounts }) {
  const [activePopover, setActivePopover] = useState(null);
  const triggerRefs = useRef({});
  
  // Generate a unique ID for this component instance to avoid ref collisions
  const componentId = useRef(Math.random().toString(36).substring(2, 15));

  // Early return if no accounts provided
  if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">No accounts selected</div>
    );
  }

  // Group accounts by platform
  const groupedByPlatform = accounts.reduce((acc, account) => {
    // Handle both populated social account data and basic account data
    const platform = (account.platform || account.type || "other").toLowerCase();
    if (!acc[platform]) {
      acc[platform] = [];
    }
    acc[platform].push(account);
    return acc;
  }, {});

  // Define the desired order of platforms (normalized to lowercase)
  const platformOrder = [
    "instagram",
    "twitter",
    "facebook",
    "threads",
    "ytshorts",
    "youtube",
    "tiktok",
    "bluesky",
    "linkedin",
  ];

  // Sort the platforms based on the defined order
  const sortedPlatforms = Object.keys(groupedByPlatform).sort((a, b) => {
    const indexA = platformOrder.indexOf(a.toLowerCase());
    const indexB = platformOrder.indexOf(b.toLowerCase());
    // Handle platforms not in the order list (put them at the end)
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const handlePlatformClick = (platform, refKey) => {
    setActivePopover(activePopover === platform ? null : platform);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {sortedPlatforms.map((platform) => {
        const platformAccounts = groupedByPlatform[platform];
        const maxVisible = 3; // Show max 3 avatars before +N
        const visibleAccounts = platformAccounts.slice(0, maxVisible);
        const remainingCount = platformAccounts.length - maxVisible;

        // Create unique ref key for this platform in this component instance
        const refKey = `${componentId.current}-${platform}`;
        if (!triggerRefs.current[refKey]) {
          triggerRefs.current[refKey] = React.createRef();
        }

        return (
          <div key={platform} className="flex items-center space-x-2">
            {/* Platform Icon - Circular background with click handler */}
            <div 
              ref={triggerRefs.current[refKey]}
              onClick={() => handlePlatformClick(platform, refKey)}
              className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
            >
              <PlatformIcon
                platform={platform}
                className="h-4 w-4 text-foreground"
              />
            </div>

            {/* Stacked Avatars with click handler */}
            <div 
              className="flex items-center -space-x-2 cursor-pointer"
              onClick={() => handlePlatformClick(platform, refKey)}
            >
              {visibleAccounts.map((account, index) => {
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
                    className="h-7 w-7 border-2 border-background hover:scale-105 transition-transform"
                    title={name}
                  >
                    <AvatarImage src={avatarSrc} alt={name} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {name ? name.charAt(0).toUpperCase() : "?"}
                    </AvatarFallback>
                  </Avatar>
                );
              })}

              {/* Show +N if there are more accounts */}
              {remainingCount > 0 && (
                <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center hover:scale-105 transition-transform">
                  <span className="text-xs font-medium text-muted-foreground">
                    +{remainingCount}
                  </span>
                </div>
              )}
            </div>

            {/* Popover */}
            <AccountPopover
              platform={platform}
              accounts={platformAccounts}
              isOpen={activePopover === platform}
              onClose={() => setActivePopover(null)}
              triggerRef={triggerRefs.current[refKey]}
            />
          </div>
        );
      })}
    </div>
  );
}
