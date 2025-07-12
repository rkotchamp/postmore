"use client";

import { createContext, useContext } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const { data: session, status: sessionStatus } = useSession();

  // Fetch user profile data from database
  const {
    data: profileData,
    isLoading: isProfileLoading,
    error: profileError,
    refetch,
  } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await fetch("/api/user/profile");
      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }
      return response.json();
    },
    enabled: !!session?.user, // Only fetch if user is authenticated
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });

  // Helper function to get user initials
  const getUserInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Determine user data with fallback strategy
  const getUserData = () => {
    // If we have profile data from database, use it
    if (profileData?.success && profileData?.user) {
      return {
        ...profileData.user,
        initials: getUserInitials(profileData.user.name),
        source: "database",
      };
    }

    // Fallback to NextAuth session data
    if (session?.user) {
      return {
        name: session.user.name || "User",
        email: session.user.email,
        image: session.user.image || null,
        initials: getUserInitials(session.user.name),
        source: "session",
      };
    }

    // Final fallback
    return {
      name: "User",
      email: "",
      image: null,
      initials: "U",
      source: "fallback",
    };
  };

  // Determine loading state
  const isLoading = sessionStatus === "loading" || isProfileLoading;

  // Determine if user is authenticated
  const isAuthenticated = !!session?.user;

  // Get user data
  const user = getUserData();

  const value = {
    user,
    isLoading,
    isAuthenticated,
    profileError,
    refetch,
    session,
    // Additional helper methods
    hasProfileError: !!profileError,
    isUsingFallback: user.source !== "database",
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
