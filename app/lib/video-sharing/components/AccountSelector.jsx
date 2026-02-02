"use client";

import React, { useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Linkedin,
  Search,
  AlertCircle,
} from "lucide-react";
import { useShareStore } from "@/app/lib/store/shareStore";
import { checkPlatformCompatibility } from "../utils/platformCompatibility";

// Platform Icons
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.321 5.562a5.124 5.124 0 0 1-5.16-4.956h-3.364v14.88c0 1.767-1.436 3.204-3.204 3.204a3.204 3.204 0 0 1-3.204-3.204 3.204 3.204 0 0 1 3.204-3.204c.282 0 .553.044.813.116v-3.364a6.552 6.552 0 0 0-.813-.052A6.568 6.568 0 0 0 1.025 15.55 6.568 6.568 0 0 0 7.593 22.12a6.568 6.568 0 0 0 6.568-6.568V9.658a8.464 8.464 0 0 0 5.16 1.752v-3.364a5.113 5.113 0 0 1-3.137-1.053 5.177 5.177 0 0 1-1.602-2.084V4.9" />
  </svg>
);

const BlueskyIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" />
    <path d="M17 12c0 2.8-2.2 5-5 5s-5-2.2-5-5 2.2-5 5-5 5 2.2 5 5Z" />
  </svg>
);

const PlatformIcon = ({ platform, className }) => {
  const iconProps = { className: className || "h-5 w-5" };
  const normalizedPlatform = platform?.toLowerCase();

  switch (normalizedPlatform) {
    case "instagram":
      return <Instagram {...iconProps} />;
    case "twitter":
    case "x":
      return <Twitter {...iconProps} />;
    case "facebook":
      return <Facebook {...iconProps} />;
    case "threads":
      return <div className={`${className || "h-5 w-5"} text-sm font-bold flex items-center justify-center`}>@</div>;
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

// Platform configuration with display names
const PLATFORM_CONFIG = {
  instagram: { name: "Instagram", order: 1 },
  tiktok: { name: "TikTok", order: 2 },
  ytshorts: { name: "YouTube Shorts", order: 3 },
  youtube: { name: "YouTube", order: 4 },
  twitter: { name: "Twitter", order: 5 },
  facebook: { name: "Facebook", order: 6 },
  threads: { name: "Threads", order: 7 },
  linkedin: { name: "LinkedIn", order: 8 },
  bluesky: { name: "Bluesky", order: 9 },
};

export function AccountSelector({ accounts = [], clips = [] }) {
  const {
    selectedAccounts,
    toggleAccount,
    setSelectedAccounts,
  } = useShareStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  // Normalize accounts to ensure consistent ID field
  const normalizedAccounts = accounts.map(account => ({
    ...account,
    id: account.id || account._id?.toString() || account._id
  }));

  // Group accounts by platform
  const groupedAccounts = normalizedAccounts.reduce((acc, account) => {
    const platform = (account.platform || account.type || "other").toLowerCase();
    if (!acc[platform]) {
      acc[platform] = [];
    }
    acc[platform].push(account);
    return acc;
  }, {});

  // Sort platforms by predefined order
  const sortedPlatforms = Object.keys(groupedAccounts).sort((a, b) => {
    const orderA = PLATFORM_CONFIG[a]?.order || 99;
    const orderB = PLATFORM_CONFIG[b]?.order || 99;
    return orderA - orderB;
  });

  // Filter platforms based on search
  const filteredPlatforms = sortedPlatforms.filter(platform => {
    if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(platform)) {
      return false;
    }

    if (searchQuery.trim() === "") return true;

    const platformName = PLATFORM_CONFIG[platform]?.name || platform;
    const platformAccounts = groupedAccounts[platform];

    // Check if platform name matches
    if (platformName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return true;
    }

    // Check if any account in this platform matches
    return platformAccounts.some(account => {
      const name = account.displayName || account.name || account.username || "";
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  });

  // Check if account is compatible with selected clips
  const isAccountCompatible = (account) => {
    if (clips.length === 0) return true;

    // Check if account is compatible with at least one clip
    return clips.some(clip => checkPlatformCompatibility(clip, account));
  };

  // Select all accounts for a platform
  const selectAllForPlatform = (platform) => {
    const platformAccounts = groupedAccounts[platform].filter(isAccountCompatible);
    const allSelected = platformAccounts.every(acc =>
      selectedAccounts.some(selected => selected.id === acc.id)
    );

    if (allSelected) {
      // Deselect all
      const idsToRemove = platformAccounts.map(acc => acc.id);
      setSelectedAccounts(selectedAccounts.filter(acc => !idsToRemove.includes(acc.id)));
    } else {
      // Select all compatible accounts
      const newAccounts = platformAccounts.filter(acc =>
        !selectedAccounts.some(selected => selected.id === acc.id)
      );
      setSelectedAccounts([...selectedAccounts, ...newAccounts]);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium text-foreground mb-2">No Accounts Connected</p>
        <p className="text-sm text-muted-foreground mb-4">
          Connect your social media accounts to start sharing clips
        </p>
        <Button onClick={() => window.location.href = "/authenticate"}>
          Connect Accounts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Platform Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={selectedPlatforms.length === 0 ? "default" : "outline"}
          onClick={() => setSelectedPlatforms([])}
        >
          All Platforms
        </Button>
        {sortedPlatforms.map(platform => (
          <Button
            key={platform}
            size="sm"
            variant={selectedPlatforms.includes(platform) ? "default" : "outline"}
            onClick={() => {
              if (selectedPlatforms.includes(platform)) {
                setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
              } else {
                setSelectedPlatforms([...selectedPlatforms, platform]);
              }
            }}
            className="flex items-center gap-2"
          >
            <PlatformIcon platform={platform} className="w-4 h-4" />
            {PLATFORM_CONFIG[platform]?.name || platform}
          </Button>
        ))}
      </div>

      {/* Selected Count with Stacked Avatars */}
      {selectedAccounts.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
          <div className="flex items-center -space-x-2">
            {selectedAccounts.slice(0, 3).map((account) => {
              const avatarSrc = account.profileImage || account.avatar || account.imageUrl;
              const name = account.displayName || account.name || account.username || "User";
              return (
                <Avatar key={account.id} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={avatarSrc} alt={name} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              );
            })}
            {selectedAccounts.length > 3 && (
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground border-2 border-background flex items-center justify-center text-xs font-semibold">
                +{selectedAccounts.length - 3}
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedAccounts([])}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Accounts List by Platform - Accordion Style */}
      <Accordion type="multiple" className="w-full space-y-2">
        {filteredPlatforms.map((platform) => {
          const platformAccounts = groupedAccounts[platform];
          const platformName = PLATFORM_CONFIG[platform]?.name || platform;

          return (
            <AccordionItem
              key={platform}
              value={platform}
              className="border rounded-lg px-4 bg-background"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={platform} className="h-5 w-5 text-foreground" />
                  <span className="font-medium text-foreground">{platformName}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 pt-1">
                <div className="space-y-2">
                  {platformAccounts.map((account) => {
                    const isSelected = selectedAccounts.some(acc => acc.id === account.id);
                    const isCompatible = isAccountCompatible(account);
                    const avatarSrc = account.profileImage || account.avatar || account.imageUrl;
                    const name = account.displayName || account.name || account.username || "User";
                    const username = account.username || account.platformUsername || account.email;

                    return (
                      <div
                        key={account.id || account._id}
                        className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                          isCompatible
                            ? "hover:bg-muted/50 cursor-pointer"
                            : "opacity-50 cursor-not-allowed"
                        }`}
                        onClick={() => isCompatible && toggleAccount(account)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={avatarSrc} alt={name} />
                            <AvatarFallback className="text-sm bg-primary/10 text-primary">
                              {name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{name}</p>
                            {username && (
                              <p className="text-sm text-muted-foreground truncate">
                                {username}
                              </p>
                            )}
                          </div>
                        </div>
                        <Checkbox
                          checked={isSelected}
                          disabled={!isCompatible}
                          onCheckedChange={() => isCompatible && toggleAccount(account)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0"
                        />
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {filteredPlatforms.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No accounts found matching your search</p>
        </div>
      )}
    </div>
  );
}
