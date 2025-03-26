"use client";

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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        <FloatingSidebar />
        <div className="flex-1 w-full ml-[215px] transition-all duration-300">
          <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b bg-background px-8 py-4 shadow-sm">
            {/* App Logo */}
            <Link href="/">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                <span className="text-xs">dappr</span>
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
          <main className="w-full p-0">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
