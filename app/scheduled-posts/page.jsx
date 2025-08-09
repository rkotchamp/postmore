"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { DashboardLayout } from "@/app/dashboard/components/dashboard-layout";
import { Post } from "@/app/components/posts/Posts";
import { CalendarDays, ChevronRight, X, Grid3X3 } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { useScheduledPosts } from "@/app/context/FetchPostContext";
import { useFetchAllAccountsContext } from "@/app/context/FetchAllAccountsContext";
import { useUserSettings } from "@/app/hooks/useUserSettings";
import { Skeleton } from "@/app/components/ui/skeleton";
import { toast } from "sonner";
import { DeletePostDialog } from "@/app/components/posts/DeletePostDialog";
import { EditScheduledPostModal } from "./components/EditScheduledPostModal";

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
    .map((post) => {
      // Handle both array and string media formats
      if (Array.isArray(post.media) && post.media.length > 0) {
        // If media is an array, get the first item's URL
        const firstMedia = post.media[0];
        return (firstMedia && typeof firstMedia === 'object') ? firstMedia.url : firstMedia;
      }
      // If media is a string URL
      return typeof post.media === 'string' ? post.media : null;
    })
    .filter(Boolean) // Remove null/undefined/empty values
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
            {image && typeof image === 'string' && image.trim() !== '' ? (
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
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    post: null,
    isLoading: false,
  });

  const [editModal, setEditModal] = useState({
    isOpen: false,
    post: null,
  });
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
  const {
    settings,
    toggleScheduledPostsView,
    isLoading: settingsLoading,
  } = useUserSettings();

  const isLoading = postsLoading || accountsLoading || settingsLoading;
  const error = postsError || accountsError;
  const isGrouped = settings.scheduledPostsView === "grouped";

  // Use the posts as they are - the Post component handles account matching
  const enhancedPosts = scheduledPosts;

  const groupedPosts = groupPostsByDate(enhancedPosts);

  const handleSelectMonth = (monthYear) => {
    setSelectedMonth(monthYear);
  };

  const handleBack = () => {
    setSelectedMonth(null);
  };

  // Handle edit post
  const handleEditPost = (post) => {
    setEditModal({
      isOpen: true,
      post: post,
    });
  };

  // Handle delete post
  const handleDeletePost = (post) => {
    setDeleteDialog({
      isOpen: true,
      post: post,
      isLoading: false,
    });
  };

  // Handle confirming delete
  const handleConfirmDelete = async (post) => {
    setDeleteDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Post deleted successfully");
        // Refresh the posts list
        refreshPosts();
        setDeleteDialog({ isOpen: false, post: null, isLoading: false });
      } else {
        throw new Error("Failed to delete post");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
      setDeleteDialog((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Handle closing delete dialog
  const handleCloseDeleteDialog = () => {
    if (!deleteDialog.isLoading) {
      setDeleteDialog({ isOpen: false, post: null, isLoading: false });
    }
  };

  // Handle closing edit modal
  const handleCloseEditModal = () => {
    setEditModal({ isOpen: false, post: null });
  };

  // Handle saving edited post
  const handleSaveEditedPost = async (updatedPost) => {
    try {
      const response = await fetch(`/api/posts/${updatedPost.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedPost),
      });

      if (response.ok) {
        // Refresh the posts list
        if (typeof refetch === "function") {
          refetch();
        }
        return true;
      } else {
        throw new Error("Failed to update post");
      }
    } catch (error) {
      console.error("Error updating post:", error);
      throw error;
    }
  };

  // If loading, show skeleton UI
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-3 sm:p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold">Scheduled Posts</h1>
            <Skeleton className="h-8 w-24" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Generate multiple skeleton cards for grid view */}
            {Array(6)
              .fill(0)
              .map((_, index) => (
                <div
                  key={index}
                  className="bg-background rounded-lg border shadow-sm w-full max-w-md aspect-square flex flex-col overflow-hidden"
                >
                  {/* Media Section - 3/5 of the height */}
                  <div className="w-full h-3/5 bg-muted relative">
                    <Skeleton className="w-full h-full rounded-t-lg" />
                  </div>

                  {/* Content Section - remaining height */}
                  <div className="flex-1 p-4 flex flex-col">
                    {/* Caption */}
                    <div className="mb-2">
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>

                    {/* Date and Time */}
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center">
                        <Skeleton className="h-3 w-3 mr-1 rounded-full" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <div className="flex items-center">
                        <Skeleton className="h-3 w-3 mr-1 rounded-full" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </div>

                    {/* Social Accounts */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center space-x-2">
                          <Skeleton className="h-7 w-7 rounded-full" />
                          <div className="flex items-center -space-x-2">
                            <Skeleton className="h-7 w-7 rounded-full" />
                            <Skeleton className="h-7 w-7 rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex justify-end">
                      <Skeleton className="h-8 w-16 rounded-md" />
                    </div>
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
              <Post
                key={post.id}
                post={post}
                onEdit={handleEditPost}
                onDelete={handleDeletePost}
              />
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
            onClick={toggleScheduledPostsView}
            className="flex items-center gap-1.5"
          >
            {isGrouped ? (
              <>
                <Grid3X3 className="h-3.5 w-3.5" />
                <span>Grid View</span>
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
              <Post
                key={post.id}
                post={post}
                onEdit={handleEditPost}
                onDelete={handleDeletePost}
              />
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

      <DeletePostDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        post={deleteDialog.post}
        isLoading={deleteDialog.isLoading}
      />

      <EditScheduledPostModal
        isOpen={editModal.isOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveEditedPost}
        post={editModal.post}
      />
    </DashboardLayout>
  );
}
