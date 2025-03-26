"use client";

import { useState } from "react";
import Image from "next/image";
import { DashboardLayout } from "@/app/dashboard/components/dashboard-layout";
import { Post } from "@/app/components/posts/Posts";
import { CalendarDays, ChevronRight, X } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";

// Dummy data with scheduled dates for grouping
const scheduledPosts = [
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
    ],
  },
  {
    id: "post2",
    media: null,
    caption:
      "Join our webinar next week to learn all about digital marketing strategies in 2023!",
    scheduledTime: "2:00 PM",
    scheduledDate: "Aug 25, 2023",
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
  {
    id: "post3",
    media: "/images/post3.jpg",
    caption:
      "Check out our latest case study on how we helped XYZ company increase their social media engagement by 200%!",
    scheduledTime: "3:15 PM",
    scheduledDate: "Sep 5, 2023",
    socialAccounts: [
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
        platform: "facebook",
      },
    ],
  },
  {
    id: "post4",
    media: "/images/post4.jpg",
    caption:
      "Our Black Friday sale is just around the corner! Get ready for amazing deals across our entire product line.",
    scheduledTime: "9:00 AM",
    scheduledDate: "Sep 12, 2023",
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
      {
        id: "acc4",
        name: "Sales",
        avatar: "/avatars/sales.jpg",
        platform: "linkedin",
      },
    ],
  },
  {
    id: "post5",
    media: "/images/post5.jpg",
    caption:
      "Happy holidays from our team to yours! We're taking a short break, but we'll be back in the new year with exciting updates.",
    scheduledTime: "12:00 PM",
    scheduledDate: "Oct 10, 2023",
    socialAccounts: [
      {
        id: "acc1",
        name: "John Doe",
        avatar: "/avatars/john.jpg",
        platform: "instagram",
      },
      {
        id: "acc3",
        name: "Business",
        avatar: "/avatars/business.jpg",
        platform: "linkedin",
      },
    ],
  },
];

// Group posts by month and year
const groupPostsByDate = (posts) => {
  const grouped = {};

  posts.forEach((post) => {
    const date = new Date(post.scheduledDate);
    const monthYear = `${date.toLocaleString("default", {
      month: "long",
    })} ${date.getFullYear()}`;

    if (!grouped[monthYear]) {
      grouped[monthYear] = [];
    }

    grouped[monthYear].push(post);
  });

  return grouped;
};

function MonthPostGroup({ monthYear, posts, onClick }) {
  // Get up to 4 images for the preview
  const postImages = posts
    .filter((post) => post.media)
    .map((post) => post.media)
    .slice(0, 4);

  // Add placeholders if we have fewer than 4 images
  while (postImages.length < 4) {
    postImages.push(null);
  }

  return (
    <div
      onClick={onClick}
      className="bg-background rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
    >
      <div
        className="grid grid-cols-2 gap-0.5 bg-muted/30"
        style={{ aspectRatio: "4/3" }}
      >
        {postImages.map((image, index) => (
          <div key={index} className="relative w-full h-full bg-muted/50">
            {image ? (
              <Image
                src={image}
                alt="Post preview"
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <CalendarDays className="h-6 w-6 text-muted-foreground/30" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{monthYear}</h3>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </p>
      </div>
    </div>
  );
}

export default function ScheduledPosts() {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const groupedPosts = groupPostsByDate(scheduledPosts);

  const handleSelectMonth = (monthYear) => {
    setSelectedMonth(monthYear);
  };

  const handleBack = () => {
    setSelectedMonth(null);
  };

  // If a month is selected, show the posts for that month
  if (selectedMonth) {
    const postsForMonth = groupedPosts[selectedMonth] || [];

    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <h1 className="text-2xl font-bold">{selectedMonth}</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {postsForMonth.map((post) => (
              <Post key={post.id} post={post} />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Otherwise show the month groups
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Scheduled Posts</h1>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Object.entries(groupedPosts).map(([monthYear, posts]) => (
            <MonthPostGroup
              key={monthYear}
              monthYear={monthYear}
              posts={posts}
              onClick={() => handleSelectMonth(monthYear)}
            />
          ))}
        </div>

        {Object.keys(groupedPosts).length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center mb-4">
              You don't have any scheduled posts yet.
            </p>
            <p className="text-muted-foreground text-center">
              Create a new post to get started!
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
