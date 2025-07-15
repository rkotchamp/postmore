"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

/**
 * Custom hook to manage user settings
 * @returns {Object} User settings data and methods
 */
export function useUserSettings() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // Fetch user settings
  const {
    data: userSettings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["userSettings"],
    queryFn: async () => {
      const response = await fetch("/api/user/profile");
      if (!response.ok) {
        throw new Error("Failed to fetch user settings");
      }
      const data = await response.json();
      return (
        data.user.settings || { theme: "system", scheduledPostsView: "grid" }
      );
    },
    enabled: !!session?.user, // Only fetch if user is logged in
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });

  // Update user settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings) => {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings: newSettings,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update settings");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Update the cache with new settings
      queryClient.setQueryData(["userSettings"], data.user.settings);
    },
  });

  // Helper function to update specific setting
  const updateSetting = (key, value) => {
    const currentSettings = userSettings || {
      theme: "system",
      scheduledPostsView: "grid",
    };
    const newSettings = {
      ...currentSettings,
      [key]: value,
    };
    updateSettingsMutation.mutate(newSettings);
  };

  // Helper function to toggle scheduled posts view
  const toggleScheduledPostsView = () => {
    const currentView = userSettings?.scheduledPostsView || "grid";
    const newView = currentView === "grid" ? "grouped" : "grid";

    // Optimistically update the cache for immediate UI feedback
    queryClient.setQueryData(["userSettings"], (oldData) => ({
      ...oldData,
      scheduledPostsView: newView,
    }));

    updateSetting("scheduledPostsView", newView);
  };

  return {
    settings: userSettings || { theme: "system", scheduledPostsView: "grid" },
    isLoading,
    error,
    updateSetting,
    toggleScheduledPostsView,
    isUpdating: updateSettingsMutation.isLoading,
  };
}
