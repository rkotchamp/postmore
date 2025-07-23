"use client";

import React, { useState, useEffect, useRef, memo, useMemo } from "react";
import { Textarea } from "@/app/components/ui/textarea";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Instagram, Twitter, Facebook, AtSign, Youtube, Linkedin } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { ScheduleToggle } from "./ScheduleToggle";
import { usePostStore } from "@/app/lib/store/postStore";
import { Switch } from "@/app/components/ui/switch";

// Memoize the PlatformIcon component
const PlatformIcon = memo(({ platform }) => {
  const iconProps = { className: "h-5 w-5" };
  switch (platform) {
    case "instagram":
      return <Instagram {...iconProps} />;
    case "twitter":
      return <Twitter {...iconProps} />;
    case "facebook":
      return <Facebook {...iconProps} />;
    case "threads":
      return <AtSign {...iconProps} />;
    case "ytShorts":
      return <Youtube {...iconProps} />;
    case "tiktok":
      return null;
    case "bluesky":
      return null;
    case "linkedin":
      return <Linkedin {...iconProps} />;
    default:
      return null;
  }
});

// Create a memoized component for account-specific caption inputs
const AccountCaptionInput = memo(
  ({ account, caption, limit, handleCaptionUpdate }) => {
    return (
      <div className="flex flex-col mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-8 w-8" title={account.name}>
            <AvatarImage src={account.imageUrl} alt={account.name} />
            <AvatarFallback className="text-[10px]">
              {account.name?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="text-sm font-medium">{account.name}</div>
        </div>
        <Textarea
          placeholder={`Write a caption for ${account.name}...`}
          className="min-h-[120px] resize-y mb-2"
          value={caption}
          maxLength={limit}
          onChange={(e) => handleCaptionUpdate(e.target.value, account.id)}
        />
        <div className="flex justify-end text-xs text-muted-foreground">
          {limit !== undefined && (
            <span>
              {caption.length || 0} / {limit}
            </span>
          )}
        </div>
      </div>
    );
  }
);

// Memoize the ScheduleToggle wrapper
const MemoizedScheduleToggle = memo(() => {
  return <ScheduleToggle />;
});

export function Caption() {
  const selectedAccounts = usePostStore((state) => state.selectedAccounts);
  const captionMode = usePostStore((state) => state.captionMode);
  const singleCaption = usePostStore((state) => state.singleCaption);
  const multiCaptions = usePostStore((state) => state.multiCaptions);
  const setCaptionMode = usePostStore((state) => state.setCaptionMode);
  const updateSingleCaption = usePostStore(
    (state) => state.updateSingleCaption
  );
  const updateAccountCaption = usePostStore(
    (state) => state.updateAccountCaption
  );
  const applySingleToAllMulti = usePostStore(
    (state) => state.applySingleToAllMulti
  );
  const scheduleType = usePostStore((state) => state.scheduleType);
  const scheduledAt = usePostStore((state) => state.scheduledAt);

  const platforms = useMemo(() => {
    if (!selectedAccounts || selectedAccounts.length === 0) return [];
    return [...new Set(selectedAccounts.map((account) => account.platform))];
  }, [selectedAccounts]);

  // Group accounts by platform
  const accountsByPlatform = useMemo(() => {
    const grouped = {};
    if (selectedAccounts && selectedAccounts.length > 0) {
      selectedAccounts.forEach((account) => {
        if (!grouped[account.platform]) {
          grouped[account.platform] = [];
        }
        grouped[account.platform].push(account);
      });
    }
    return grouped;
  }, [selectedAccounts]);

  const [openAccordionItems, setOpenAccordionItems] = useState([]);
  useEffect(() => {
    const newOpenItems = captionMode === "multiple" ? [...platforms] : [];

    const currentItems = new Set(openAccordionItems);
    const nextItems = new Set(newOpenItems);

    if (
      currentItems.size !== nextItems.size ||
      ![...currentItems].every((item) => nextItems.has(item))
    ) {
      setOpenAccordionItems(newOpenItems);
    }
  }, [captionMode, platforms, openAccordionItems]);

  const characterLimits = {
    instagram: 2200,
    twitter: 280,
    facebook: 5000,
    threads: 500,
    youtube: 5000,
    tiktok: 2000,
    ytShorts: 100,
    bluesky: 300,
    linkedin: 3000,
  };

  const handleCaptionUpdate = (value, accountId = null) => {
    if (captionMode === "single") {
      updateSingleCaption(value);
    } else if (accountId) {
      updateAccountCaption(accountId, value);
    } else {
      console.warn(
        "Attempted to update caption in multiple mode without an account ID"
      );
    }
  };

  const platformNames = {
    instagram: "Instagram",
    twitter: "Twitter",
    facebook: "Facebook",
    threads: "Threads",
    ytShorts: "YouTube Shorts",
    tiktok: "TikTok",
    bluesky: "Bluesky",
    linkedin: "LinkedIn",
  };

  // Memoize the character limit calculation
  const minCharacterLimit = useMemo(() => {
    if (!platforms || platforms.length === 0) return Infinity;

    const limits = platforms
      .map((p) => characterLimits[p] || Infinity)
      .filter((limit) => Number.isFinite(limit));

    return limits.length > 0 ? Math.min(...limits) : Infinity;
  }, [platforms]);

  // Also memoize the caption length to prevent recalculation
  const singleCaptionLength = useMemo(() => {
    return singleCaption?.length || 0;
  }, [singleCaption]);

  // Helper to get caption for a specific account
  const getAccountCaption = (accountId) => {
    return multiCaptions[accountId] || "";
  };

  if (!selectedAccounts || selectedAccounts.length === 0) {
    return (
      <div className="p-4 border rounded bg-muted/10">
        <p className="text-muted-foreground text-center">
          Select accounts first to write captions.
        </p>
      </div>
    );
  }

  if (captionMode === "multiple" && (!platforms || platforms.length === 0)) {
    return (
      <div className="p-4 border rounded bg-muted/10">
        <p className="text-muted-foreground text-center">
          Something went wrong. No platforms found for selected accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Caption</h2>

        <div className="flex border rounded-lg overflow-hidden">
          <Button
            type="button"
            variant={captionMode === "single" ? "default" : "ghost"}
            className="rounded-none"
            onClick={() => setCaptionMode("single")}
          >
            One Caption for All
          </Button>
          <Button
            type="button"
            variant={captionMode === "multiple" ? "default" : "ghost"}
            className="rounded-none"
            onClick={() => setCaptionMode("multiple")}
          >
            Caption for Each
          </Button>
        </div>
      </div>

      {captionMode === "single" ? (
        <Card>
          <CardContent className="p-4">
            <Textarea
              placeholder="Write a caption for all platforms..."
              className="min-h-[150px] resize-y mb-2"
              value={singleCaption}
              maxLength={minCharacterLimit}
              onChange={(e) => handleCaptionUpdate(e.target.value)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Character count: {singleCaptionLength}</span>
              <span>
                Using the lowest character limit from selected platforms
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Accordion
          type="multiple"
          value={openAccordionItems}
          onValueChange={setOpenAccordionItems}
          className="w-full space-y-2"
        >
          {platforms.map((platform) => {
            if (!platformNames[platform]) return null;

            const platformAccounts = accountsByPlatform[platform] || [];
            const limit = characterLimits[platform];

            return (
              <AccordionItem
                key={platform}
                value={platform}
                className="border rounded-lg overflow-hidden bg-background"
              >
                <AccordionTrigger className="flex items-center gap-3 py-3 px-4 hover:no-underline bg-muted/10">
                  <div className="flex items-center gap-2 flex-1">
                    <PlatformIcon platform={platform} />
                    <span className="font-medium">
                      {platformNames[platform]}
                    </span>
                  </div>
                  <div className="flex items-center -space-x-2 mr-2">
                    {platformAccounts.map((account) => (
                      <Avatar
                        key={account.id}
                        className="h-6 w-6 border-2 border-background"
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
                </AccordionTrigger>
                <AccordionContent className="p-4 border-t bg-background">
                  {platformAccounts.map((account) => (
                    <AccountCaptionInput
                      key={account.id}
                      account={account}
                      caption={getAccountCaption(account.id)}
                      limit={limit}
                      handleCaptionUpdate={handleCaptionUpdate}
                    />
                  ))}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <div className="mt-4">
        <MemoizedScheduleToggle />
      </div>

      {captionMode === "multiple" && singleCaption && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={applySingleToAllMulti}>
            Copy single caption to all accounts
          </Button>
        </div>
      )}
    </div>
  );
}
