"use client";

import { useState, useEffect } from "react";
import { SidebarProvider } from "@/app/components/ui/sidebar";
import { FloatingSidebar } from "@/app/dashboard/components/floatingSidebar";
import { UserNav } from "@/app/dashboard/components/userProfile";
import { Button } from "@/app/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/app/providers/themeProvider";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";

export function DashboardLayout({ children }) {
  const { theme, setTheme } = useTheme();
  // Use null for initial state to avoid hydration mismatch
  const [sidebarExpanded, setSidebarExpanded] = useState(null);

  // Calculate margin classes based on sidebar state
  const getContentClasses = () => {
    // During SSR and initial hydration, use a consistent class
    if (sidebarExpanded === null) {
      return "flex-1 w-full transition-all duration-300 lg:ml-24 md:ml-20 ml-16";
    }

    // After hydration, update classes based on sidebar state
    return `flex-1 w-full transition-all duration-300 ${
      sidebarExpanded ? "lg:ml-56 md:ml-24 ml-20" : "lg:ml-24 md:ml-20 ml-16"
    }`;
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        <FloatingSidebar
          onExpandChange={setSidebarExpanded}
          initialExpanded={null} // Let component decide based on viewport
        />
        <div className={getContentClasses()}>
          <header className="sticky top-0 z-10 flex h-20 items-center justify-between  bg-background px-4 md:px-8 py-4 shadow-sm">
            {/* App Logo */}
            <Link href="/">
              <div className="flex h-10 items-center justify-center">
                <img
                  src="/PostmooreSvg.svg"
                  alt="Postmoore"
                  className="h-8 w-auto"
                />
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setTheme(theme === "light" ? "dark" : "light")
                    }
                    aria-label="Toggle theme"
                  >
                    {theme === "light" ? (
                      <Moon className="h-5 w-5" />
                    ) : (
                      <Sun className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {theme === "light"
                    ? "Switch to dark mode"
                    : "Switch to light mode"}
                </TooltipContent>
              </Tooltip>
              <UserNav />
            </div>
          </header>
          <main className="w-full p-0 md:p-2 lg:p-4">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
