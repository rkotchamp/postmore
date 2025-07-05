"use client";

import Image from "next/image";
import { Button } from "@/app/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import {
  PenSquare,
  Calendar,
  Clock,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Share2,
  Play,
  FileText,
  AtSign,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { SelectedAccountsDisplay } from "./SelectedAccountsDisplay";
import { useState, useEffect } from "react";
import { VideoPreview } from "./VideoPreview";
import { ImagePreview } from "./ImagePreview";

// Dummy data for demonstration
const dummyPosts = [
  {
    id: "post1",
    media: "/images/post1.jpg",
    caption:
      "Excited to announce our new product launch! Stay tuned for more updates coming soon. #newproduct #launch #exciting",
    scheduledTime: "10:30 AM",
    scheduledDate: "Aug 15, 2023",
    socialAccounts: [
      {
        id: "acc1",
        name: "John Doe",
        avatar: "/avatars/john.jpg",
        platform: "facebook",
      },
      {
        id: "acc2",
        name: "Marketing",
        avatar: "/avatars/marketing.jpg",
        platform: "instagram",
      },
      {
        id: "acc3",
        name: "Business",
        avatar: "/avatars/business.jpg",
        platform: "twitter",
      },
    ],
  },
  {
    id: "post2",
    media: null, // No media example
    caption:
      "Join our webinar next week to learn all about digital marketing strategies in 2023!",
    scheduledTime: "2:00 PM",
    scheduledDate: "Sep 5, 2023",
    socialAccounts: [
      {
        id: "acc1",
        name: "John Doe",
        avatar: "/avatars/john.jpg",
        platform: "linkedin",
      },
      {
        id: "acc3",
        name: "Business",
        avatar: "/avatars/business.jpg",
        platform: "twitter",
      },
    ],
  },
];

// TikTok icon component
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

// Bluesky icon component
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

// Platform configuration
const platformConfig = {
  instagram: { name: "Instagram", Icon: Instagram },
  twitter: { name: "Twitter (X)", Icon: Twitter },
  facebook: { name: "Facebook", Icon: Facebook },
  threads: { name: "Threads", Icon: AtSign },
  tiktok: { name: "TikTok", Icon: TikTokIcon },
  ytshorts: { name: "YouTube Shorts", Icon: Youtube },
  youtube: { name: "YouTube", Icon: Youtube },
  bluesky: { name: "Bluesky", Icon: BlueskyIcon },
  linkedin: { name: "LinkedIn", Icon: Linkedin },
};

export function Post({ post }) {
  // Add state for caption carousel
  const [currentCaptionIndex, setCurrentCaptionIndex] = useState(0);
  const [captionAccountIds, setCaptionAccountIds] = useState([]);

  // Make sure we handle both socialAccounts and accounts fields for compatibility
  const accountsArray = post.socialAccounts || post.accounts || [];

  // Extract caption data and account IDs on component mount
  useEffect(() => {
    if (
      post.captions &&
      post.captions.mode === "multiple" &&
      post.captions.multiple
    ) {
      // Get the account IDs that have captions
      const accountIds = Object.keys(post.captions.multiple);
      setCaptionAccountIds(accountIds);
    }
  }, [post.captions]);

  // Helper function to get the current caption based on mode and index
  const getCurrentCaption = () => {
    if (!post.captions) return "";

    if (post.captions.mode === "single") {
      return post.captions.single || post.caption || post.text || "";
    }

    if (
      post.captions.mode === "multiple" &&
      post.captions.multiple &&
      captionAccountIds.length > 0
    ) {
      const currentAccountId = captionAccountIds[currentCaptionIndex];
      return (
        post.captions.multiple[currentAccountId] || post.captions.single || ""
      );
    }

    // Fallback to any caption field available
    return post.caption || post.text || "";
  };

  // Get the account object for the current caption index (for multiple mode)
  const getCurrentCaptionAccount = () => {
    if (post.captions?.mode !== "multiple" || !captionAccountIds.length) {
      return null;
    }

    const currentAccountId = captionAccountIds[currentCaptionIndex];
    return accountsArray.find((account) => account.id === currentAccountId);
  };

  // Helper function to navigate to next caption
  const goToNextCaption = (e) => {
    e.stopPropagation();
    if (captionAccountIds.length <= 1) return;
    setCurrentCaptionIndex((prev) => (prev + 1) % captionAccountIds.length);
  };

  // Helper function to navigate to previous caption
  const goToPrevCaption = (e) => {
    e.stopPropagation();
    if (captionAccountIds.length <= 1) return;
    setCurrentCaptionIndex(
      (prev) => (prev - 1 + captionAccountIds.length) % captionAccountIds.length
    );
  };

  // Helper function to extract media URL based on data structure
  const getMediaUrl = () => {
    let resultUrl = null;

    // Handle case where post.media is an array of objects (like from Firebase)
    if (post.originalPost?.media && Array.isArray(post.originalPost.media)) {
      const mediaItem = post.originalPost.media[0];
      resultUrl = mediaItem?.url || null;
      console.log("[DEBUG] URL from originalPost.media:", resultUrl);
    }

    // Handle case where post.media is directly an array of objects
    if (
      !resultUrl &&
      post.media &&
      Array.isArray(post.media) &&
      post.media.length > 0
    ) {
      const mediaItem = post.media[0];
      // Check if media item is an object with url property (Firebase structure)
      if (mediaItem && typeof mediaItem === "object" && mediaItem.url) {
        resultUrl = mediaItem.url;
        console.log("[DEBUG] URL from post.media array:", resultUrl);
      }
    }

    // Handle the case where post.media is already a string URL
    if (!resultUrl && post.media && typeof post.media === "string") {
      resultUrl = post.media;
    }

    return resultUrl;
  };

  // Helper function to determine media type
  const getMediaType = () => {
    let mediaType = null;

    // First check original structure
    if (
      post.originalPost?.media &&
      Array.isArray(post.originalPost.media) &&
      post.originalPost.media[0]
    ) {
      mediaType = post.originalPost.media[0].type || "unknown";
      console.log("[DEBUG] Media type from originalPost:", mediaType);
    }

    // Then check media array directly
    if (
      !mediaType &&
      post.media &&
      Array.isArray(post.media) &&
      post.media.length > 0
    ) {
      if (post.media[0].type) {
        mediaType = post.media[0].type;
        console.log("[DEBUG] Media type from post.media array:", mediaType);
      }
    }

    // Fallback to checking file extension
    if (!mediaType) {
      const mediaUrl = getMediaUrl();
      if (mediaUrl) {
        if (mediaUrl.match(/\.(mp4|mov|webm|avi)($|\?)/i)) {
          mediaType = "video";
          console.log("[DEBUG] Media type detected from extension: video");
        } else if (mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)($|\?)/i)) {
          mediaType = "image";
          console.log("[DEBUG] Media type detected from extension: image");
        }
      }
    }

    const finalType =
      mediaType ||
      (post.contentType === "media" ? "unknown" : post.contentType);
    console.log("[DEBUG] Final media type:", finalType);
    return finalType;
  };

  // Function to get all image URLs for carousel
  const getImageUrls = () => {
    // Check if post has original media array
    if (post.originalPost?.media && Array.isArray(post.originalPost.media)) {
      return post.originalPost.media
        .filter((item) => item.type === "image" && item.url)
        .map((item) => item.url);
    }

    // Check if post has direct media array
    if (post.media && Array.isArray(post.media)) {
      const imageUrls = post.media
        .filter((item) => (item.type === "image" || !item.type) && item.url)
        .map((item) => item.url);

      if (imageUrls.length > 0) return imageUrls;
    }

    // If post.media is a string, return as single item array
    if (post.media && typeof post.media === "string") {
      return [post.media];
    }

    return [];
  };

  // Function to render the appropriate media content
  const renderMedia = () => {
    // For text-only posts
    if (post.contentType === "text") {
      return (
        <div className="w-full h-full flex items-center justify-center bg-muted/30 p-4">
          <div className="w-full h-full flex items-center justify-center relative bg-background rounded-md border p-3">
            <FileText className="h-6 w-6 text-muted-foreground/50 absolute top-2 right-2" />
            <p className="text-sm line-clamp-4 text-center">{post.text}</p>
          </div>
        </div>
      );
    }

    // For media posts, extract the media URL directly
    let mediaUrl = null;
    let mediaType = null;
    let thumbnailUrl = null;
    let allImages = [];

    // Try to get media from the post.media array (Firebase format)
    if (post.media && Array.isArray(post.media) && post.media.length > 0) {
      // Check if there are multiple images
      allImages = post.media
        .filter(
          (item) =>
            item &&
            typeof item === "object" &&
            item.type === "image" &&
            item.url
        )
        .map((item) => item.url);

      // If we have multiple images, use them for the image carousel
      if (allImages.length > 1) {
        return <ImagePreview images={allImages} />;
      }

      // Otherwise, proceed with single media handling
      const mediaItem = post.media[0];

      if (mediaItem && typeof mediaItem === "object") {
        mediaUrl = mediaItem.url;
        mediaType = mediaItem.type;

        // Check for thumbnail in multiple possible locations
        thumbnailUrl = mediaItem.thumbnail || post.thumbnail || null;
      } else if (typeof post.media === "string") {
        mediaUrl = post.media;
        // Try to determine type from URL
        if (mediaUrl.match(/\.(mp4|mov|webm|avi)($|\?)/i)) {
          mediaType = "video";
        } else if (mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)($|\?)/i)) {
          mediaType = "image";
        }
      }
    }

    // Also check original post structure
    if (
      !mediaUrl &&
      post.originalPost?.media &&
      Array.isArray(post.originalPost.media) &&
      post.originalPost.media.length > 0
    ) {
      // Check if there are multiple images in original post
      allImages = post.originalPost.media
        .filter(
          (item) =>
            item &&
            typeof item === "object" &&
            item.type === "image" &&
            item.url
        )
        .map((item) => item.url);

      // If we have multiple images, use them for the image carousel
      if (allImages.length > 1) {
        return <ImagePreview images={allImages} />;
      }

      // Otherwise, proceed with single media handling
      const mediaItem = post.originalPost.media[0];
      if (mediaItem) {
        mediaUrl = mediaItem.url;
        mediaType = mediaItem.type;
        thumbnailUrl = mediaItem.thumbnail || post.thumbnail || null;
      }
    }

    // If no media URL found
    if (!mediaUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-muted/50">
          <p className="text-muted-foreground text-sm">No media attached</p>
        </div>
      );
    }

    // For video content
    if (mediaType === "video") {
      // Try multiple possible thumbnail sources
      if (!thumbnailUrl) {
        thumbnailUrl =
          post.thumbnail ||
          post.thumbnailUrl ||
          (post.media && post.media[0] && post.media[0].thumbnail) ||
          null;
      }

      return (
        <VideoPreview
          videoUrl={mediaUrl}
          thumbnailUrl={thumbnailUrl}
          id={
            post.id || `post-video-${Math.random().toString(36).substring(7)}`
          }
        />
      );
    }

    // For image content (single or carousel)
    if (mediaType === "image") {
      // If it's a single image
      if (typeof mediaUrl === "string") {
        return <ImagePreview images={mediaUrl} />;
      }

      // If we have multiple images in the media array
      const imageUrls = (post.media || [])
        .filter((item) => item.type === "image" && item.url)
        .map((item) => item.url);

      if (imageUrls.length > 0) {
        return <ImagePreview images={imageUrls} />;
      }
    }

    // Default case - unrecognized media
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/50">
        <p className="text-muted-foreground text-sm">
          Unsupported media format
        </p>
      </div>
    );
  };

  // Helper function to render the appropriate caption
  const renderCaption = () => {
    if (post.contentType === "text") {
      return (
        <p className="text-sm line-clamp-3 text-muted-foreground font-medium">
          Text post scheduled for {accountsArray.length} account(s)
        </p>
      );
    }

    // Get the current caption
    const caption = getCurrentCaption();
    const currentAccount = getCurrentCaptionAccount();

    return (
      <div className="relative">
        {/* If in multiple mode and we have a current account, show account info */}
        {post.captions?.mode === "multiple" && (
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center">
              {currentAccount && (
                <>
                  <Avatar className="h-4 w-4 mr-1.5">
                    <AvatarImage src={currentAccount.avatar} />
                    <AvatarFallback className="text-[8px]">
                      {currentAccount.name?.charAt(0) || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-muted-foreground">
                    {currentAccount.name || "Account"}
                  </span>
                </>
              )}
            </div>

            {/* Only show carousel controls if we're in multiple mode and have more than one caption */}
            {captionAccountIds.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={goToPrevCaption}
                  className="p-0.5 rounded-full bg-muted/50 hover:bg-muted"
                >
                  <ChevronLeft className="h-2.5 w-2.5 text-muted-foreground" />
                </button>

                <div className="flex space-x-0.5 items-center">
                  {captionAccountIds.map((_, index) => (
                    <span
                      key={index}
                      className={`block h-1 w-1 rounded-full ${
                        index === currentCaptionIndex
                          ? "bg-primary"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={goToNextCaption}
                  className="p-0.5 rounded-full bg-muted/50 hover:bg-muted"
                >
                  <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* The caption text */}
        <p className="text-sm line-clamp-3 font-medium">
          {caption || (
            <span className="italic text-muted-foreground">No caption</span>
          )}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-background rounded-lg border shadow-sm w-full max-w-md aspect-square flex flex-col overflow-hidden">
      {/* Media Section */}
      <div className="w-full h-3/5 bg-muted relative">{renderMedia()}</div>

      {/* Content Section */}
      <div className="flex-1 p-4 flex flex-col">
        {/* Caption */}
        <div className="mb-2">{renderCaption()}</div>

        {/* Date and Time */}
        <div className="flex justify-between items-center text-xs text-muted-foreground mb-3">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            <span>{post.scheduledDate}</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            <span>{post.scheduledTime}</span>
          </div>
        </div>

        {/* Social Accounts */}
        <div className="mb-3">
          <SelectedAccountsDisplay accounts={accountsArray} />
        </div>

        {/* Actions */}
        <div className="mt-auto flex justify-end mb-4">
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <PenSquare className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PostGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {/* Dummy posts removed from here */}
    </div>
  );
}

export default PostGrid;
