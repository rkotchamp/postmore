"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@/app/context/UserContext";

const ThemeProviderContext = createContext({});

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  ...props
}) {
  const { user, isLoading: isUserLoading, refetch } = useUser();
  const [theme, setTheme] = useState(defaultTheme);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize theme from user settings when user data is available
  useEffect(() => {
    if (!isUserLoading && user?.settings?.theme) {
      setTheme(user.settings.theme);
      setIsInitialized(true);
    } else if (!isUserLoading && !user?.settings?.theme) {
      // If no user settings, try localStorage as fallback
      const savedTheme = localStorage.getItem(storageKey);
      if (savedTheme) {
        setTheme(savedTheme);
      }
      setIsInitialized(true);
    }
  }, [isUserLoading, user?.settings?.theme, storageKey]);

  // Apply theme to DOM
  useEffect(() => {
    if (!isInitialized) return;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme, isInitialized]);

  // Function to update theme both in state and database
  const updateTheme = async (newTheme) => {
    try {
      // Update local state immediately for responsive UI
      setTheme(newTheme);

      // Save to localStorage as fallback
      localStorage.setItem(storageKey, newTheme);

      // If user is logged in, update database
      if (user) {
        const response = await fetch("/api/user/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            settings: {
              theme: newTheme,
            },
          }),
        });

        if (response.ok) {
          // Refresh user data to sync with database
          await refetch();
        } else {
          console.error("Failed to update theme in database");
        }
      }
    } catch (error) {
      console.error("Error updating theme:", error);
    }
  };

  const value = {
    theme,
    setTheme: updateTheme,
    isInitialized,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
