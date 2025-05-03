"use client";

import React, { useState, useEffect, useRef, useContext, memo } from "react";
import { Textarea } from "@/app/components/ui/textarea";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Instagram, Twitter, Facebook, AtSign, Youtube } from "lucide-react";
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
import { Switch } from "@/app/components/ui/switch";
import { ScheduleToggle } from "./ScheduleToggle";
import { usePostData } from "@/app/context/PostDataContext";

export function Caption({ selectedAccounts = [] }) {
  const { postData, setPostData, handleCaptionModeChange, setSchedule } =
    usePostData();
  const {
    captionMode,
    scheduleType,
    scheduledAt,
    singleCaption,
    multiCaptions,
  } = postData;

  const platforms = [
    ...new Set(selectedAccounts.map((account) => account.platform)),
  ];

  const [openAccordionItems, setOpenAccordionItems] = useState([]);
  useEffect(() => {
    if (captionMode === "multiple") {
      setOpenAccordionItems(platforms);
    }
  }, [captionMode, platforms]);

  const MemoizedScheduleToggle = memo(ScheduleToggle);

  const characterLimits = {
    instagram: 2200,
    twitter: 280,
    facebook: 5000,
    threads: 500,
    youtube: 5000,
  };

  const handleCaptionUpdate = (value, platform = null) => {
    setPostData((prev) => {
      if (captionMode === "single") {
        if (prev.singleCaption === value) return prev;
        return { ...prev, singleCaption: value };
      } else if (platform) {
        if (prev.multiCaptions[platform] === value) return prev;
        const newMultiCaptions = { ...prev.multiCaptions, [platform]: value };
        return { ...prev, multiCaptions: newMultiCaptions };
      } else {
        console.warn(
          "Attempted to update caption in multiple mode without a platform"
        );
        return prev;
      }
    });
  };

  const handleScheduleUpdate = (newScheduledState, date, time) => {
    const scheduleTypeValue = newScheduledState ? "scheduled" : "immediate";

    let combinedDateTime = null;
    if (newScheduledState && date && time) {
      try {
        const dateString =
          typeof date === "string" ? date : date.toISOString().split("T")[0];
        const timeString = typeof time === "string" ? time : "00:00";
        combinedDateTime = new Date(`${dateString}T${timeString}`);
        if (isNaN(combinedDateTime.getTime())) {
          throw new Error("Invalid Date object created");
        }
      } catch (error) {
        console.error("Error creating scheduled date:", error);
        combinedDateTime = new Date();
      }
    }

    console.log("Updating schedule:", scheduleTypeValue, combinedDateTime);
    setSchedule(scheduleTypeValue, combinedDateTime);
  };

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

  const platformNames = {
    instagram: "Instagram",
    twitter: "Twitter",
    facebook: "Facebook",
    threads: "Threads",
    youtube: "YouTube",
  };

  const getAccountCountByPlatform = (platform) => {
    return selectedAccounts.filter((account) => account.platform === platform)
      .length;
  };

  if (captionMode === "multiple" && (!platforms || platforms.length === 0)) {
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
            variant={captionMode === "single" ? "default" : "ghost"}
            className="rounded-none"
            onClick={() => handleCaptionModeChange("single")}
          >
            One Caption for All
          </Button>
          <Button
            type="button"
            variant={captionMode === "multiple" ? "default" : "ghost"}
            className="rounded-none"
            onClick={() => handleCaptionModeChange("multiple")}
          >
            Caption for Each
          </Button>
        </div>
      </div>

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

      {captionMode === "single" ? (
        <Card>
          <CardContent className="p-4">
            <Textarea
              placeholder="Write a caption for all platforms..."
              className="min-h-[150px] resize-y mb-2"
              value={singleCaption}
              maxLength={Math.min(
                ...platforms.map((p) => characterLimits[p] || 5000)
              )}
              onChange={(e) => handleCaptionUpdate(e.target.value)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Character count: {singleCaption?.length || 0}</span>
              <span>
                Using the lowest character limit from all selected platforms
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
            const platformAccounts = selectedAccounts.filter(
              (acc) => acc.platform === platform
            );
            const platformCaption = multiCaptions?.[platform] || "";
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
                  <Textarea
                    placeholder={`Write a caption for ${platformNames[platform]}...`}
                    className="min-h-[120px] resize-y mb-2"
                    value={platformCaption}
                    maxLength={characterLimits[platform]}
                    onChange={(e) =>
                      handleCaptionUpdate(e.target.value, platform)
                    }
                  />
                  <div className="flex justify-end text-xs text-muted-foreground">
                    <span>
                      {platformCaption.length || 0} /{characterLimits[platform]}
                    </span>
                  </div>
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPostData((prev) => {
                const updatedMultiCaptions = { ...prev.multiCaptions };
                platforms.forEach((platform) => {
                  updatedMultiCaptions[platform] = prev.singleCaption;
                });
                return { ...prev, multiCaptions: updatedMultiCaptions };
              });
            }}
          >
            Copy single caption to all platforms
          </Button>
        </div>
      )}
    </div>
  );
}
