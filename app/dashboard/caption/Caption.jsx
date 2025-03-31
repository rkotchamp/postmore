"use client";

import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/app/components/ui/textarea";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Instagram, Twitter, Facebook, AtSign, Youtube } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { Badge } from "@/app/components/ui/badge";
import { Switch } from "@/app/components/ui/switch";
import { ScheduleToggle } from "./ScheduleToggle";

export function Caption({ selectedAccounts = [], onCaptionChange }) {
  const [mode, setMode] = useState("single"); // "single" or "multiple"
  const [scheduled, setScheduled] = useState(false); // Track if post is scheduled
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [scheduledTime, setScheduledTime] = useState("12:00");
  const [captions, setCaptions] = useState({
    single: "",
    platforms: {
      instagram: "",
      twitter: "",
      facebook: "",
      threads: "",
      youtube: "",
    },
  });

  // Track previous captions to prevent unnecessary updates
  const prevCaptionsRef = useRef(null);

  // Get unique platforms from selected accounts
  const platforms = [
    ...new Set(selectedAccounts.map((account) => account.platform)),
  ];

  // Character limits for different platforms
  const characterLimits = {
    instagram: 2200,
    twitter: 280,
    facebook: 5000,
    threads: 500,
    youtube: 5000,
  };

  // Update parent component when captions change
  useEffect(() => {
    // Skip initial render
    if (!prevCaptionsRef.current) {
      prevCaptionsRef.current = captions;
      return;
    }

    if (onCaptionChange) {
      let captionData = {};

      if (mode === "single") {
        // For single mode, create an object with the same caption for all platforms
        platforms.forEach((platform) => {
          captionData[platform] = captions.single;
        });
      } else {
        // For multiple mode, just pass the platform-specific captions
        captionData = { ...captions.platforms };
      }

      // Add scheduling information
      captionData.scheduled = scheduled;
      if (scheduled) {
        captionData.scheduledDate = scheduledDate;
        captionData.scheduledTime = scheduledTime;
      }

      // Only notify parent if data has actually changed
      const currentDataStr = JSON.stringify({
        ...captionData,
        scheduledDate: scheduled ? scheduledDate.toISOString() : null,
      });

      const prevDataStr = JSON.stringify(
        prevCaptionsRef.current === captions
          ? {
              ...(mode === "single"
                ? Object.fromEntries(
                    platforms.map((p) => [p, prevCaptionsRef.current.single])
                  )
                : prevCaptionsRef.current.platforms),
              scheduledDate: scheduled ? scheduledDate.toISOString() : null,
              scheduledTime: scheduled ? scheduledTime : null,
              scheduled,
            }
          : {}
      );

      if (currentDataStr !== prevDataStr) {
        onCaptionChange(captionData);
        prevCaptionsRef.current = captions;
      }
    }
  }, [captions, mode, platforms, scheduled, scheduledDate, scheduledTime]);

  // Handle caption text change
  const handleCaptionChange = (value, platform = "single") => {
    if (mode === "single" || platform === "single") {
      setCaptions((prev) => ({
        ...prev,
        single: value,
      }));
    } else {
      setCaptions((prev) => ({
        ...prev,
        platforms: {
          ...prev.platforms,
          [platform]: value,
        },
      }));
    }
  };

  // Toggle scheduled state and handle date/time updates
  const handleScheduleToggle = (newScheduledState, date, time) => {
    setScheduled(newScheduledState);
    if (date) setScheduledDate(date);
    if (time) setScheduledTime(time);
  };

  // Get platform icon
  const PlatformIcon = ({ platform }) => {
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
      case "youtube":
        return <Youtube {...iconProps} />;
      default:
        return null;
    }
  };

  // Platform display names
  const platformNames = {
    instagram: "Instagram",
    twitter: "Twitter",
    facebook: "Facebook",
    threads: "Threads",
    youtube: "YouTube",
  };

  // Get accounts count by platform
  const getAccountCountByPlatform = (platform) => {
    return selectedAccounts.filter((account) => account.platform === platform)
      .length;
  };

  if (mode === "multiple" && (!platforms || platforms.length === 0)) {
    return (
      <div className="p-4 border rounded bg-muted/10">
        <p className="text-muted-foreground text-center">
          Select accounts to enable platform-specific captions.
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
            variant={mode === "single" ? "default" : "ghost"}
            className="rounded-none"
            onClick={() => setMode("single")}
          >
            One Caption for All
          </Button>
          <Button
            type="button"
            variant={mode === "multiple" ? "default" : "ghost"}
            className="rounded-none"
            onClick={() => setMode("multiple")}
          >
            Caption for Each
          </Button>
        </div>
      </div>

      {/* Platform selection info */}
      {selectedAccounts.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {platforms.map((platform) => (
            <Badge
              key={platform}
              variant="outline"
              className="flex items-center gap-1 px-3 py-1"
            >
              <PlatformIcon platform={platform} />
              <span>{platformNames[platform]}</span>
              <span className="ml-1 text-xs">
                ({getAccountCountByPlatform(platform)})
              </span>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm mb-4">
          No accounts selected. Please select accounts first.
        </p>
      )}

      {/* Caption editor */}
      {mode === "single" ? (
        <Card>
          <CardContent className="p-4">
            <Textarea
              placeholder="Write a caption for all platforms..."
              className="min-h-[150px] resize-y mb-2"
              value={captions.single}
              maxLength={Math.min(
                ...platforms.map((p) => characterLimits[p] || 5000)
              )}
              onChange={(e) => handleCaptionChange(e.target.value)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Character count: {captions.single.length}</span>
              <span>
                Using the lowest character limit from all selected platforms
              </span>
            </div>

            {/* Schedule toggle button */}
            <ScheduleToggle
              scheduled={scheduled}
              onToggle={(newState, date, time) =>
                handleScheduleToggle(newState, date, time)
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={platforms.length > 0 ? platforms[0] : "default"}>
          {platforms.length > 0 ? (
            <TabsList className="mb-4">
              {platforms.map((platform) => (
                <TabsTrigger key={platform} value={platform}>
                  {platformNames[platform] || platform}
                </TabsTrigger>
              ))}
            </TabsList>
          ) : (
            <TabsTrigger value="default">Default</TabsTrigger>
          )}

          {platforms.map((platform) => (
            <TabsContent key={platform} value={platform}>
              <Card>
                <CardContent className="p-4">
                  <Textarea
                    placeholder={`Write a caption for ${platformNames[platform]}...`}
                    className="min-h-[150px] resize-y mb-2"
                    value={captions.platforms[platform]}
                    maxLength={characterLimits[platform]}
                    onChange={(e) =>
                      handleCaptionChange(e.target.value, platform)
                    }
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Character count: {captions.platforms[platform].length}
                    </span>
                    <span>Limit: {characterLimits[platform]} characters</span>
                  </div>
                </CardContent>
                {/* Schedule toggle button */}
                <ScheduleToggle
                  scheduled={scheduled}
                  onToggle={(newState, date, time) =>
                    handleScheduleToggle(newState, date, time)
                  }
                />
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Copy buttons - optional feature */}
      {mode === "multiple" && captions.single && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const updatedPlatforms = { ...captions.platforms };
              platforms.forEach((platform) => {
                updatedPlatforms[platform] = captions.single;
              });
              setCaptions((prev) => ({
                ...prev,
                platforms: updatedPlatforms,
              }));
            }}
          >
            Copy single caption to all platforms
          </Button>
        </div>
      )}
    </div>
  );
}
