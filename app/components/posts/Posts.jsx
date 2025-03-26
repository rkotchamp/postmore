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
} from "lucide-react";
import { cn } from "@/app/lib/utils";

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

// Platform colors for fallback avatars and icon mapping
const platformInfo = {
  facebook: { color: "bg-blue-500", icon: Facebook },
  instagram: { color: "bg-pink-500", icon: Instagram },
  twitter: { color: "bg-sky-400", icon: Twitter },
  linkedin: { color: "bg-blue-700", icon: Linkedin },
  youtube: { color: "bg-red-600", icon: Youtube },
  tiktok: { color: "bg-black", icon: Share2 }, // Placeholder for TikTok
};

export function Post({ post }) {
  return (
    <div className="bg-background rounded-lg border shadow-sm w-full max-w-md aspect-square flex flex-col overflow-hidden">
      {/* Media Section */}
      <div className="w-full h-2/5 bg-muted relative">
        {post.media ? (
          <Image
            src={post.media}
            alt="Post media"
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/50">
            <p className="text-muted-foreground text-sm">No media attached</p>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex-1 p-4 flex flex-col">
        {/* Caption */}
        <div className="mb-2">
          <p className="text-sm line-clamp-3">{post.caption}</p>
        </div>

        {/* Date and Time */}
        <div className="flex justify-between items-center text-xs text-muted-foreground mb-4">
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
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Posting to:</p>
          <div className="flex flex-wrap gap-3">
            {post.socialAccounts.map((account) => {
              const PlatformIcon =
                platformInfo[account.platform]?.icon || Share2;
              return (
                <div key={account.id} className="relative">
                  <Avatar className="h-10 w-10 border-2 border-background">
                    <AvatarImage src={account.avatar} alt={account.name} />
                    <AvatarFallback
                      className={cn(
                        "text-xs",
                        platformInfo[account.platform]?.color || "bg-primary"
                      )}
                    >
                      {account.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 rounded-full w-5 h-5 bg-white p-0.5 shadow-sm border">
                    <PlatformIcon
                      className={cn(
                        "w-full h-full",
                        account.platform === "facebook" && "text-blue-600",
                        account.platform === "instagram" && "text-pink-600",
                        account.platform === "twitter" && "text-sky-500",
                        account.platform === "linkedin" && "text-blue-700",
                        account.platform === "youtube" && "text-red-600",
                        account.platform === "tiktok" && "text-black"
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex justify-end">
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
      {dummyPosts.map((post) => (
        <Post key={post.id} post={post} />
      ))}
    </div>
  );
}

export default PostGrid;
