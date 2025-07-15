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

export default function AllPosts() {
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [filteredPosts, setFilteredPosts] = useState(null); // Changed to null as data is now fetched
  const [selectedMonthFilter, setSelectedMonthFilter] = useState(null);
  const [selectedYearFilter, setSelectedYearFilter] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const { allPosts, isLoading: contextLoading, error } = useAllPosts();

  // Get unique months and years from all posts
  const { months, years } = getUniqueMonthsAndYears(allPosts || []);

  // Apply filters when month or year selection changes
  useEffect(() => {
    if (!allPosts) return;

    let filtered = [...allPosts];

    if (selectedMonthFilter) {
      filtered = filtered.filter((post) => {
        const date = new Date(post.scheduledDate);
        const month = date.toLocaleString("default", { month: "long" });
        return month === selectedMonthFilter;
      });
    }

    if (selectedYearFilter) {
      filtered = filtered.filter((post) => {
        const date = new Date(post.scheduledDate);
        const year = date.getFullYear().toString();
        return year === selectedYearFilter;
      });
    }

    setFilteredPosts(filtered);
  }, [selectedMonthFilter, selectedYearFilter, allPosts]);

  // Simulate loading for the main view
  useEffect(() => {
    setIsLoading(contextLoading);
  }, [contextLoading]);

  const groupedPosts = groupPostsByDate(filteredPosts || []);

  const handleSelectMonth = (monthYear) => {
    setSelectedMonth(monthYear);
  };

  const handleBack = () => {
    setSelectedMonth(null);
  };

  const handleResetFilters = () => {
    setSelectedMonthFilter(null);
    setSelectedYearFilter(null);
  };

  // Handle error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">All Posts</h1>
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-red-500 text-center mb-4">
              Failed to load posts. Please try again.
            </p>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
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
            {isLoading ? (
              // Generate multiple skeleton cards for grid view
              Array(6)
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
                ))
            ) : postsForMonth.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground text-center mb-4">
                  No posts found for {selectedMonth}.
                </p>
                <Button variant="outline" onClick={handleResetFilters}>
                  Reset Filters
                </Button>
              </div>
            ) : (
              postsForMonth.map((post) => <Post key={post.id} post={post} />)
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Otherwise show the filter and month groups
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">All Posts</h1>

        {/* Filter Section */}
        <div className="flex flex-wrap items-center gap-3 mb-6 bg-muted/20 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter by:</span>
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
                  value={selectedMonthFilter}
                  onValueChange={setSelectedMonthFilter}
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
                  value={selectedYearFilter}
                  onValueChange={setSelectedYearFilter}
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

                {(selectedMonthFilter || selectedYearFilter) && (
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {isLoading ? (
            // Generate multiple skeleton cards for month groups
            Array(8)
              .fill(0)
              .map((_, index) => (
                <div
                  key={index}
                  className="bg-background rounded-lg border shadow-sm overflow-hidden"
                >
                  {/* Skeleton image grid */}
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

                  {/* Skeleton text content */}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-4" />
                    </div>
                    <Skeleton className="h-3 w-14 mt-0.5" />
                  </div>
                </div>
              ))
          ) : allPosts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center mb-4">
                No posts found for the selected filters.
              </p>
              <Button variant="outline" onClick={handleResetFilters}>
                Reset Filters
              </Button>
            </div>
          ) : (
            Object.entries(groupedPosts).map(([monthYear, posts]) => (
              <MonthPostGroup
                key={monthYear}
                monthYear={monthYear}
                posts={posts}
                onClick={() => handleSelectMonth(monthYear)}
              />
            ))
          )}
        </div>

        {!isLoading && Object.keys(groupedPosts).length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center mb-4">
              {allPosts && allPosts.length === 0
                ? "You don't have any posts yet."
                : "No posts found for the selected filters."}
            </p>
            {allPosts && allPosts.length > 0 && (
              <Button variant="outline" onClick={handleResetFilters}>
                Reset Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
