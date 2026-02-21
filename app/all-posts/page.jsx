"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { DashboardLayout } from "@/app/dashboard/components/dashboard-layout";
import { Post } from "@/app/components/posts/Posts";
import { CalendarDays, ChevronRight, X, Filter } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { useAllPosts } from "@/app/context/FetchAllPostsContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { toast } from "sonner";
import { DeletePostDialog } from "@/app/components/posts/DeletePostDialog";

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

// Extract unique months and years for filtering
const getUniqueMonthsAndYears = (posts) => {
  const months = new Set();
  const years = new Set();

  posts.forEach((post) => {
    const date = new Date(post.scheduledDate);
    const month = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear().toString();

    months.add(month);
    years.add(year);
  });

  return {
    months: Array.from(months),
    years: Array.from(years),
  };
};

function MonthPostGroup({ monthYear, posts, onClick }) {
  const postImages = posts
    .filter((post) => post.media)
    .map((post) => {
      if (Array.isArray(post.media) && post.media.length > 0) {
        const firstMedia = post.media[0];
        return (firstMedia && typeof firstMedia === "object")
          ? firstMedia.url
          : firstMedia;
      }
      return typeof post.media === "string" ? post.media : null;
    })
    .filter(Boolean)
    .slice(0, 4);

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
            {image && typeof image === "string" && image.trim() !== "" ? (
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

export default function AllPosts() {
  // selectedMonth is only used when in grouped view and user drills into a month
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [filteredPosts, setFilteredPosts] = useState(null);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState(null);
  const [selectedYearFilter, setSelectedYearFilter] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    post: null,
    isLoading: false,
  });

  const { allPosts, isLoading, error } = useAllPosts();

  const { months, years } = getUniqueMonthsAndYears(allPosts || []);

  // Whether any date filter is active — determines grouped vs flat grid
  const isFiltered = !!(selectedMonthFilter || selectedYearFilter);

  // Apply filters
  useEffect(() => {
    if (!allPosts) return;

    let filtered = [...allPosts];

    if (selectedMonthFilter) {
      filtered = filtered.filter((post) => {
        const date = new Date(post.scheduledDate);
        return date.toLocaleString("default", { month: "long" }) === selectedMonthFilter;
      });
    }

    if (selectedYearFilter) {
      filtered = filtered.filter((post) => {
        const date = new Date(post.scheduledDate);
        return date.getFullYear().toString() === selectedYearFilter;
      });
    }

    setFilteredPosts(filtered);
  }, [selectedMonthFilter, selectedYearFilter, allPosts]);

  // When filter is cleared, also clear any selected month drill-in
  const handleResetFilters = () => {
    setSelectedMonthFilter(null);
    setSelectedYearFilter(null);
    setSelectedMonth(null);
  };

  const handleEditPost = (post) => {
    toast.info(`Edit post: ${post.id}`);
  };

  const handleDeletePost = (post) => {
    setDeleteDialog({ isOpen: true, post, isLoading: false });
  };

  const handleConfirmDelete = async (post) => {
    setDeleteDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Post deleted successfully");
        window.location.reload();
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

  const handleCloseDeleteDialog = () => {
    if (!deleteDialog.isLoading) {
      setDeleteDialog({ isOpen: false, post: null, isLoading: false });
    }
  };

  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">All Posts</h1>
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-red-500 text-center mb-4">
              Failed to load posts. Please try again.
            </p>
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Posts to display (filtered or all)
  const displayPosts = filteredPosts ?? allPosts ?? [];
  const groupedPosts = groupPostsByDate(displayPosts);

  // Drilled into a specific month (only possible when in grouped view)
  if (selectedMonth) {
    const postsForMonth = groupedPosts[selectedMonth] || [];

    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMonth(null)}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <h1 className="text-2xl font-bold">{selectedMonth}</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {postsForMonth.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-center mb-4">
                  No posts found for {selectedMonth}.
                </p>
                <Button variant="outline" onClick={handleResetFilters}>
                  Reset Filters
                </Button>
              </div>
            ) : (
              postsForMonth.map((post) => (
                <Post
                  key={post.id}
                  post={post}
                  onEdit={handleEditPost}
                  onDelete={handleDeletePost}
                />
              ))
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">All Posts</h1>

        {/* Filter bar — no background */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isLoading ? (
              <>
                <Skeleton className="h-9 w-[120px]" />
                <Skeleton className="h-9 w-[100px]" />
              </>
            ) : (
              <>
                <Select
                  value={selectedMonthFilter ?? ""}
                  onValueChange={(v) => setSelectedMonthFilter(v || null)}
                >
                  <SelectTrigger className="w-[120px] h-9">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedYearFilter ?? ""}
                  onValueChange={(v) => setSelectedYearFilter(v || null)}
                >
                  <SelectTrigger className="w-[100px] h-9">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {isFiltered && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-9"
                  >
                    Clear
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Loading skeletons */}
        {isLoading ? (
          isFiltered ? (
            // Grouped skeleton
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array(8)
                .fill(0)
                .map((_, index) => (
                  <div
                    key={index}
                    className="bg-background rounded-lg border shadow-sm overflow-hidden"
                  >
                    <div
                      className="grid grid-cols-2 gap-0.5 bg-muted/30"
                      style={{ aspectRatio: "4/3" }}
                    >
                      {Array(4)
                        .fill(0)
                        .map((_, i) => (
                          <Skeleton key={i} className="w-full h-full" />
                        ))}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-4" />
                      </div>
                      <Skeleton className="h-3 w-14 mt-0.5" />
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            // Flat grid skeleton
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6)
                .fill(0)
                .map((_, index) => (
                  <div
                    key={index}
                    className="bg-background rounded-lg border shadow-sm w-full max-w-md aspect-square flex flex-col overflow-hidden"
                  >
                    <div className="w-full h-3/5 bg-muted relative">
                      <Skeleton className="w-full h-full rounded-t-lg" />
                    </div>
                    <div className="flex-1 p-4 flex flex-col">
                      <div className="mb-2">
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-4 w-3/4 mb-1" />
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <Skeleton className="h-7 w-7 rounded-full" />
                        <Skeleton className="h-7 w-7 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )
        ) : displayPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center mb-4">
              {allPosts && allPosts.length === 0
                ? "You don't have any posts yet."
                : "No posts found for the selected filters."}
            </p>
            {isFiltered && (
              <Button variant="outline" onClick={handleResetFilters}>
                Reset Filters
              </Button>
            )}
          </div>
        ) : isFiltered ? (
          // Grouped view — only when a filter is active
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Object.entries(groupedPosts).map(([monthYear, posts]) => (
              <MonthPostGroup
                key={monthYear}
                monthYear={monthYear}
                posts={posts}
                onClick={() => setSelectedMonth(monthYear)}
              />
            ))}
          </div>
        ) : (
          // Default flat grid — all posts
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayPosts.map((post) => (
              <Post
                key={post.id}
                post={post}
                onEdit={handleEditPost}
                onDelete={handleDeletePost}
              />
            ))}
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
    </DashboardLayout>
  );
}
