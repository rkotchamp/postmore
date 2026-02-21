"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselApi,
} from "@/app/components/ui/carousel";
import { format } from "date-fns";
import {
  Instagram,
  Twitter,
  Facebook,
  AtSign,
  Youtube,
  Clock,
  Image as ImageIcon,
} from "lucide-react";
import { useMediaItems } from "@/app/hooks/useMediaQueries";
import { usePostStore } from "@/app/lib/store/postStore";
import { SelectedAccountsPreview } from "../selectAccount/SelectedAccountsPreview";
import { MediaPlayer } from "@/app/dashboard/VideoPlayer/MediaPlayer";
import { ThumbnailSelector } from "@/app/dashboard/VideoPlayer/ThumbnailSelector";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/lib/utils";

const TikTokIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 12a4 4 0 1 0 4 4V4c.23 2.58 1.32 4.19 4 5v3c-1.5-.711-2.717-.216-4 1v3" />
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
    <path d="M2.5 12a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" />
    <path d="M9 9.75C9 8.784 9.784 8 10.75 8h2.5c.966 0 1.75.784 1.75 1.75v4.5A1.75 1.75 0 0 1 13.25 16h-2.5A1.75 1.75 0 0 1 9 14.25v-4.5z" />
  </svg>
);

const platformConfig = {
  instagram: { name: "Instagram", Icon: Instagram, color: "#E1306C" },
  twitter: { name: "Twitter (X)", Icon: Twitter, color: "#1DA1F2" },
  facebook: { name: "Facebook", Icon: Facebook, color: "#1877F2" },
  threads: { name: "Threads", Icon: AtSign, color: "#000000" },
  tiktok: { name: "TikTok", Icon: TikTokIcon, color: "#000000" },
  ytShorts: { name: "YouTube Shorts", Icon: Youtube, color: "#FF0000" },
  bluesky: { name: "Bluesky", Icon: BlueskyIcon, color: "#007AFF" },
};

export function Preview() {
  const { data: mediaItems = [], isLoading: isLoadingMedia } = useMediaItems();
  const [blobUrlsCreated, setBlobUrlsCreated] = useState(false);

  const scheduleType = usePostStore((state) => state.scheduleType);
  const scheduledAt = usePostStore((state) => state.scheduledAt);
  const selectedAccounts = usePostStore((state) => state.selectedAccounts);
  const singleCaption = usePostStore((state) => state.singleCaption);
  const multiCaptions = usePostStore((state) => state.multiCaptions);
  const captionMode = usePostStore((state) => state.captionMode);
  const getCaptionForAccount = usePostStore(
    (state) => state.getCaptionForAccount
  );
  const tiktokSettings = usePostStore((state) => state.tiktokSettings);

  const setVideoThumbnail = usePostStore((state) => state.setVideoThumbnail);
  const getVideoThumbnail = usePostStore((state) => state.getVideoThumbnail);

  const [thumbnailSelectorOpen, setThumbnailSelectorOpen] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState(null);

  const [activeAccount, setActiveAccount] = useState(null);
  const [captionIndex, setCaptionIndex] = useState(0);

  // State to track when a thumbnail is updated
  const [thumbnailUpdateCounter, setThumbnailUpdateCounter] = useState(0);

  // State for carousel
  const [carouselApi, setCarouselApi] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Create blob URLs with useMemo to avoid recreating them on every render
  const previewUrls = useMemo(() => {
    const urls = {};

    if (!mediaItems?.length) return urls;

    // Use a try-catch block around the entire creation process
    try {
      mediaItems.forEach((item) => {
        if (item.file instanceof File) {
          // Create a new blob URL for each file
          urls[item.id] = URL.createObjectURL(item.file);
        }
      });
    } catch (error) {
      console.error("Error creating blob URLs:", error);
    }

    return urls;
  }, [mediaItems]); // Only recreate when mediaItems change

  // Use a separate effect to handle the blobUrlsCreated state
  useEffect(() => {
    // Reset blob creation state when mediaItems change
    setBlobUrlsCreated(false);

    // Set a timer to mark blob URLs as created after a small delay
    const timer = setTimeout(() => {
      setBlobUrlsCreated(true);
    }, 100); // Small delay to ensure browser processes the URLs

    return () => clearTimeout(timer); // Clean up timer on unmount or when mediaItems change
  }, [mediaItems]);

  // Use a ref to track the latest previewUrls for cleanup
  const previewUrlsRef = useRef(previewUrls);

  // Update the ref whenever previewUrls changes
  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  // IMPORTANT: Separate cleanup effect with EMPTY dependency array to run ONLY on unmount
  useEffect(() => {
    // Cleanup function that runs ONLY when component unmounts
    return () => {
      Object.values(previewUrlsRef.current).forEach((url) => {
        if (url?.startsWith?.("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []); // Empty dependency array - only runs on unmount

  const contentType = useMemo(() => {
    if (!mediaItems || mediaItems.length === 0) return "none";
    if (mediaItems[0].type === "video") return "video";
    if (mediaItems.length === 1 && mediaItems[0].type === "image")
      return "singleImage";
    if (
      mediaItems.length > 1 &&
      mediaItems.every((item) => item.type === "image")
    )
      return "carousel";
    return "mixed";
  }, [mediaItems]);

  const formattedScheduledDateTime = useMemo(() => {
    if (scheduleType === "scheduled" && scheduledAt) {
      try {
        return format(new Date(scheduledAt), "MMM d, yyyy 'at' h:mm a");
      } catch (error) {
        console.error("Error formatting date:", error, "Value:", scheduledAt);
        return "Invalid Date";
      }
    } else if (scheduleType === "immediate") {
      return "Immediately";
    } else {
      return "Not scheduled";
    }
  }, [scheduleType, scheduledAt]);

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

  // Set active account based on selected accounts and reset caption index when accounts change
  useEffect(() => {
    if (!activeAccount && selectedAccounts.length > 0) {
      setActiveAccount(selectedAccounts[0]);
      setCaptionIndex(0);
    } else if (
      activeAccount &&
      !selectedAccounts.some((acc) => acc.id === activeAccount.id)
    ) {
      setActiveAccount(selectedAccounts[0] || null);
      setCaptionIndex(0);
    }
  }, [selectedAccounts, activeAccount]);

  // When caption mode changes, reset caption index
  useEffect(() => {
    setCaptionIndex(0);
  }, [captionMode]);

  // Get current caption based on active account or caption mode
  const currentCaption = useMemo(() => {
    if (captionMode === "single") {
      return singleCaption || "";
    }

    if (activeAccount) {
      return getCaptionForAccount(activeAccount.id) || "";
    }

    return "";
  }, [captionMode, singleCaption, activeAccount, getCaptionForAccount]);

  // Current platform icon based on active account
  const CurrentPlatformIcon = activeAccount
    ? platformConfig[activeAccount.platform]?.Icon
    : null;

  // Navigate through account captions in multi-caption mode
  const goToNextCaption = () => {
    if (selectedAccounts.length <= 1) return;
    setCaptionIndex((prev) => (prev + 1) % selectedAccounts.length);
    setActiveAccount(
      selectedAccounts[(captionIndex + 1) % selectedAccounts.length]
    );
  };

  const goToPrevCaption = () => {
    if (selectedAccounts.length <= 1) return;
    setCaptionIndex(
      (prev) => (prev - 1 + selectedAccounts.length) % selectedAccounts.length
    );
    setActiveAccount(
      selectedAccounts[
        (captionIndex - 1 + selectedAccounts.length) % selectedAccounts.length
      ]
    );
  };

  // Handle opening the thumbnail selector for a video
  const handleEditThumbnail = (videoId) => {
    setSelectedVideoId(videoId);
    setThumbnailSelectorOpen(true);
    // Force a refresh of the MediaPlayer when opening the selector
    setThumbnailUpdateCounter((prev) => prev + 1);
  };

  // Handle thumbnail capture from the selector
  const handleThumbnailCapture = (thumbnailFile) => {
    if (selectedVideoId) {
      setVideoThumbnail(selectedVideoId, thumbnailFile);
      // Increment counter to force MediaPlayer refresh
      setThumbnailUpdateCounter((prev) => prev + 1);
    }
  };

  // Handle thumbnail upload from the selector
  const handleThumbnailUpload = (thumbnailFile) => {
    if (selectedVideoId) {
      setVideoThumbnail(selectedVideoId, thumbnailFile);
      // Increment counter to force MediaPlayer refresh
      setThumbnailUpdateCounter((prev) => prev + 1);
    }
  };

  // Handle closing the thumbnail selector
  const handleThumbnailSelectorClose = () => {
    setThumbnailSelectorOpen(false);
  };

  // Get the video file for the thumbnail selector
  const selectedVideoFile = useMemo(() => {
    if (!selectedVideoId) return null;
    return mediaItems.find((item) => item.id === selectedVideoId)?.file || null;
  }, [selectedVideoId, mediaItems]);

  // Handle carousel changes
  useEffect(() => {
    if (!carouselApi) return;

    const handleSelect = () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    };

    carouselApi.on("select", handleSelect);
    // Get initial position
    handleSelect();

    return () => {
      carouselApi.off("select", handleSelect);
    };
  }, [carouselApi]);

  if (isLoadingMedia) {
    return (
      <Card className="lg:w-[40%] xl:w-1/3 w-full h-fit sticky top-24">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading preview...</p>
        </CardContent>
      </Card>
    );
  }

  if (contentType === "none" && selectedAccounts.length === 0) {
    return (
      <Card className="lg:w-[40%] xl:w-1/3 w-full h-fit sticky top-24">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Add content and select accounts to see preview.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:w-[40%] xl:w-1/3 w-full h-fit sticky top-24 overflow-hidden border shadow-sm">
      <CardHeader className="border-b bg-muted/30 py-3 px-4">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <span>Preview</span>
          {selectedAccounts.length > 1 && captionMode === "single" && (
            <select
              value={activeAccount?.id || ""}
              onChange={(e) => {
                const newAccount = selectedAccounts.find(
                  (acc) => acc.id === e.target.value
                );
                if (newAccount) {
                  setActiveAccount(newAccount);
                  // Find index of the new account in selectedAccounts
                  const newIndex = selectedAccounts.findIndex(
                    (acc) => acc.id === newAccount.id
                  );
                  if (newIndex >= 0) {
                    setCaptionIndex(newIndex);
                  }
                }
              }}
              className="text-xs p-1 rounded border bg-background text-foreground ml-2"
            >
              {selectedAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} (
                  {platformConfig[account.platform]?.name || account.platform})
                </option>
              ))}
            </select>
          )}
          {selectedAccounts.length === 1 &&
            activeAccount &&
            CurrentPlatformIcon && (
              <span className="flex items-center gap-1.5 text-xs ml-2 text-muted-foreground">
                <CurrentPlatformIcon className="h-3 w-3" />
                {activeAccount.name}
              </span>
            )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <SelectedAccountsPreview accounts={selectedAccounts} />

        <div className="aspect-[16/13] w-full bg-muted/40 rounded-md overflow-hidden flex items-center justify-center relative">
          {contentType === "none" && (
            <p className="text-muted-foreground text-sm p-4 text-center">
              Add media to see preview
            </p>
          )}
          {contentType === "video" &&
            mediaItems[0] &&
            previewUrls[mediaItems[0].id] && (
              <div className="relative w-full h-full">
                <MediaPlayer
                  key={`video-${mediaItems[0].id}-${
                    blobUrlsCreated ? "loaded" : "loading"
                  }-thumb-${thumbnailUpdateCounter}`}
                  file={mediaItems[0].file}
                  type="video"
                  id={mediaItems[0].id}
                  controls
                />

                {/* Edit Cover button for videos - positioned at the top-right */}
                <div className="absolute top-2 right-2 z-[20]">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex items-center gap-1.5 bg-black/50 hover:bg-black/70 text-white"
                    onClick={() => handleEditThumbnail(mediaItems[0].id)}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span className="text-xs">Edit Cover</span>
                  </Button>
                </div>
              </div>
            )}
          {contentType === "singleImage" &&
            mediaItems[0] &&
            previewUrls[mediaItems[0].id] && (
              <MediaPlayer
                key={`img-${mediaItems[0].id}-${
                  blobUrlsCreated ? "loaded" : "loading"
                }`}
                file={mediaItems[0].file}
                type="image"
                id={mediaItems[0].id}
              />
            )}
          {contentType === "carousel" && mediaItems.length > 0 && (
            <Carousel className="w-full h-full" setApi={setCarouselApi}>
              <CarouselContent className="h-full">
                {mediaItems.map((item, index) => (
                  <CarouselItem
                    key={`carousel-${item.id}-${
                      blobUrlsCreated ? "loaded" : "loading"
                    }`}
                    className="h-full"
                  >
                    <div className="relative w-full h-full flex items-center justify-center">
                      {item.file ? (
                        <MediaPlayer
                          file={item.file}
                          type="image"
                          id={item.id}
                        />
                      ) : (
                        <div className="text-muted-foreground text-xs">
                          Loading media...
                        </div>
                      )}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {mediaItems.length > 1 && (
                <>
                  <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10" />
                  <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10" />

                  {/* Carousel indicator dots */}
                  <div className="absolute bottom-2 w-full flex justify-center gap-1 z-10">
                    {mediaItems.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => carouselApi?.scrollTo(index)}
                        className={cn(
                          "h-2 w-2 rounded-full transition-all",
                          currentSlide === index
                            ? "bg-primary scale-125"
                            : "bg-primary/50 hover:bg-primary/80"
                        )}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </Carousel>
          )}
        </div>

        {(contentType !== "none" || selectedAccounts.length > 0) && (
          <div className="text-sm space-y-2 relative py-2 min-h-[90px]">
            {/* Caption title area with navigation for multi-caption mode */}
            {captionMode === "multiple" && selectedAccounts.length > 0 && (
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {activeAccount && (
                    <>
                      {platformConfig[activeAccount.platform]?.Icon && (
                        <span className="flex items-center">
                          {(() => {
                            const IconComponent =
                              platformConfig[activeAccount.platform].Icon;
                            return (
                              <IconComponent className="h-3.5 w-3.5 mr-1.5" />
                            );
                          })()}
                        </span>
                      )}
                      <span className="text-xs font-medium">
                        {activeAccount.name}
                      </span>
                    </>
                  )}
                </div>
                {selectedAccounts.length > 1 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <button
                      onClick={goToPrevCaption}
                      className="p-1 hover:bg-muted rounded-full"
                      aria-label="Previous caption"
                      disabled={selectedAccounts.length <= 1}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-chevron-left"
                      >
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>
                    <span>
                      {captionIndex + 1}/{selectedAccounts.length}
                    </span>
                    <button
                      onClick={goToNextCaption}
                      className="p-1 hover:bg-muted rounded-full"
                      aria-label="Next caption"
                      disabled={selectedAccounts.length <= 1}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-chevron-right"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Caption content */}
            <p className="text-foreground whitespace-pre-wrap break-words">
              {currentCaption ||
                (contentType === "none" && selectedAccounts.length > 0 ? (
                  ""
                ) : (
                  <span className="text-muted-foreground italic">
                    No caption added yet...
                  </span>
                ))}
            </p>
          </div>
        )}

        {/* TikTok settings summary */}
        {selectedAccounts.some((acc) => acc.platform === "tiktok") && (
          <div className="pt-2 border-t space-y-1.5">
            <p className="text-xs font-medium flex items-center gap-1.5">
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 12a4 4 0 1 0 4 4V4c.23 2.58 1.32 4.19 4 5v3c-1.5-.711-2.717-.216-4 1v3" />
              </svg>
              TikTok
            </p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>Privacy:</span>
              <span
                className={
                  !tiktokSettings.privacyLevel ? "text-destructive font-medium" : ""
                }
              >
                {tiktokSettings.privacyLevel === "PUBLIC_TO_EVERYONE"
                  ? "Everyone"
                  : tiktokSettings.privacyLevel === "MUTUAL_FOLLOW_FRIENDS"
                  ? "Friends"
                  : tiktokSettings.privacyLevel === "SELF_ONLY"
                  ? "Only me"
                  : "Not set ⚠️"}
              </span>
              <span>Comments:</span>
              <span>{tiktokSettings.disableComment ? "Off" : "On"}</span>
              <span>Duets:</span>
              <span>{tiktokSettings.disableDuet ? "Off" : "On"}</span>
              <span>Stitches:</span>
              <span>{tiktokSettings.disableStitch ? "Off" : "On"}</span>
              <span>Music:</span>
              <span
                className={
                  !tiktokSettings.musicConfirmed ? "text-destructive font-medium" : ""
                }
              >
                {tiktokSettings.musicConfirmed ? "Confirmed ✓" : "Not confirmed ⚠️"}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t mt-auto">
          <Clock className="h-3.5 w-3.5" />
          <span>{formattedScheduledDateTime}</span>
        </div>
      </CardContent>

      {/* Thumbnail Selector Modal */}
      {selectedVideoFile && (
        <ThumbnailSelector
          videoFile={selectedVideoFile}
          videoId={selectedVideoId}
          onThumbnailCapture={handleThumbnailCapture}
          onThumbnailUpload={handleThumbnailUpload}
          isOpen={thumbnailSelectorOpen}
          onClose={handleThumbnailSelectorClose}
        />
      )}
    </Card>
  );
}
