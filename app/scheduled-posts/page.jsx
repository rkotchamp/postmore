"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { DashboardLayout } from "@/app/dashboard/components/dashboard-layout";
import { Post } from "@/app/components/posts/Posts";
import { CalendarDays, ChevronRight, X } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { useScheduledPosts } from "@/app/context/FetchPostContext";
import { useFetchAllAccountsContext } from "@/app/context/FetchAllAccountsContext";
import { Skeleton } from "@/app/components/ui/skeleton";

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
      className="bg-background rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden w-full"
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
                <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground/30" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-2 sm:p-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-xs sm:text-sm">{monthYear}</h3>
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
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
  const [isGrouped, setIsGrouped] = useState(true);
  const {
    scheduledPosts,
    isLoading: postsLoading,
    error: postsError,
    refetch: refreshPosts,
  } = useScheduledPosts();
  const {
    accounts,
    isLoading: accountsLoading,
    error: accountsError,
  } = useFetchAllAccountsContext();

  const isLoading = postsLoading || accountsLoading;
  const error = postsError || accountsError;

  // Enhance posts with complete account data
  const enhancedPosts = scheduledPosts.map((post) => {
    // Map account references to full account objects
    const enhancedAccounts = post.socialAccounts.map((accountRef) => {
      // Try to find the full account info from the accounts context
      const fullAccount = accounts.find((acc) => acc._id === accountRef.id);

      // If we found a match, enhance the account data
      if (fullAccount) {
        return {
          ...accountRef,
          // Override with more accurate data from the full account
          avatar:
            fullAccount.profileImage ||
            fullAccount.metadata?.profileImage ||
            accountRef.avatar,
          name:
            fullAccount.platformUsername ||
            fullAccount.displayName ||
            accountRef.name,
          platform: fullAccount.platform || accountRef.platform,
        };
      }

      // If no match found, return the original reference
      return accountRef;
    });

    return {
      ...post,
      socialAccounts: enhancedAccounts,
    };
  });

  const groupedPosts = groupPostsByDate(enhancedPosts);

  const handleSelectMonth = (monthYear) => {
    setSelectedMonth(monthYear);
  };

  const handleBack = () => {
    setSelectedMonth(null);
  };

  // If loading, show skeleton UI
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-3 sm:p-4 md:p-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
            Scheduled Posts
          </h1>
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {/* Generate multiple skeleton cards */}
            {Array(8)
              .fill(0)
              .map((_, index) => (
                <div
                  key={index}
                  className="bg-background rounded-lg border shadow-sm overflow-hidden"
                >
                  {/* Skeleton image grid */}
                  <div
                    className="grid grid-cols-2 gap-0.5"
                    style={{ aspectRatio: "4/3" }}
                  >
                    {Array(4)
                      .fill(0)
                      .map((_, i) => (
                        <Skeleton key={i} className="w-full h-full" />
                      ))}
                  </div>

                  {/* Skeleton text content */}
                  <div className="p-2 sm:p-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 sm:h-5 w-20 sm:w-24" />
                      <Skeleton className="h-3 sm:h-4 w-3 sm:w-4 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-14 sm:w-16 mt-2" />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <DashboardLayout>
        <div className="p-3 sm:p-4 md:p-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
            Scheduled Posts
          </h1>
          <div className="flex flex-col items-center justify-center h-60">
            <p className="text-red-500 mb-4 text-center px-4">
              Failed to load your scheduled posts
            </p>
            <Button onClick={refreshPosts}>Try Again</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // If a month is selected, show the posts for that month
  if (selectedMonth) {
    const postsForMonth = groupedPosts[selectedMonth] || [];

    return (
      <DashboardLayout>
        <div className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="flex items-center gap-1 w-fit"
            >
              <X className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold">{selectedMonth}</h1>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {postsForMonth.map((post) => (
              <Post key={post.id} post={post} />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Otherwise show the month groups or all posts depending on isGrouped state
  return (
    <DashboardLayout>
      <div className="p-3 sm:p-4 md:p-6">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">Scheduled Posts</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsGrouped(!isGrouped)}
            className="flex items-center gap-1.5"
          >
            {isGrouped ? (
              <>
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Show All</span>
              </>
            ) : (
              <>
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Group by Month</span>
              </>
            )}
          </Button>
        </div>

        {isGrouped ? (
          // Grouped view - show month groups
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {Object.entries(groupedPosts).map(([monthYear, posts]) => (
              <MonthPostGroup
                key={monthYear}
                monthYear={monthYear}
                posts={posts}
                onClick={() => handleSelectMonth(monthYear)}
              />
            ))}
          </div>
        ) : (
          // Ungrouped view - show all posts in a grid
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {enhancedPosts.map((post) => (
              <Post key={post.id} post={post} />
            ))}
          </div>
        )}

        {Object.keys(groupedPosts).length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12">
            <p className="text-muted-foreground text-center mb-4 px-4">
              You don't have any scheduled posts yet.
            </p>
            <Link href="/dashboard">
              <Button className="mt-2">Create a post</Button>
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
