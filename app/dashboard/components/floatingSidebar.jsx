"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Home,
  LayoutGrid,
  Building2,
  Mail,
  Settings,
  Network,
  BarChart3,
  Clock,
  Cog,
  ChevronRight,
  ChevronLeft,
  CalendarClock,
  Layers,
  Plus,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Sidebar } from "@/app/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { TooltipProvider } from "@/app/components/ui/tooltip";
import { UserNav } from "./userProfile";

// Custom Bluesky icon component

const navItems = [
  { icon: Plus, href: "/", label: "Create Post" },
  { icon: LayoutGrid, href: "/dashboard", label: "New Post" },
  {
    icon: CalendarClock,
    href: "/scheduled-posts",
    label: "Scheduled Posts",
  },
  { icon: Layers, href: "/all-posts", label: "All Posts" },
  { icon: Network, href: "/authenticate", label: "Authenticate" },

  // { icon: BarChart3, href: "/analytics", label: "Analytics" },
];

export function FloatingSidebar({ onExpandChange, initialExpanded }) {
  const [activeItem, setActiveItem] = useState("/");
  const [expanded, setExpanded] = useState(initialExpanded || false);

  // Update expanded state when initialExpanded prop changes
  useEffect(() => {
    if (initialExpanded !== undefined) {
      setExpanded(initialExpanded);
    }
  }, [initialExpanded]);

  // Check for screen size on mount and when window resizes
  useEffect(() => {
    const checkScreenSize = () => {
      // Close sidebar by default on small screens (less than lg breakpoint)
      if (window.innerWidth < 1024) {
        setExpanded(false);
      } else {
        // On large screens, default to expanded
        setExpanded(true);
      }
    };

    // Initial check
    checkScreenSize();

    // Add event listener for window resize
    window.addEventListener("resize", checkScreenSize);

    // Cleanup
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  useEffect(() => {
    const pathname = window.location.pathname;
    setActiveItem(pathname);
  }, []);

  // Notify parent component when expanded state changes
  useEffect(() => {
    if (onExpandChange) {
      onExpandChange(expanded);
    }
  }, [expanded, onExpandChange]);

  const toggleSidebar = () => {
    setExpanded(!expanded);
  };

  return (
    <TooltipProvider>
      <Sidebar
        className={cn(
          "fixed left-4 top-1/2 -translate-y-1/2 h-[calc(100vh-4rem)] max-h-[600px] rounded-xl border bg-background shadow-lg transition-all duration-300 z-50",
          expanded ? "w-48" : "w-16",
          // Responsive adjustments for mobile
          "md:left-4 left-2",
          "md:max-h-[600px] max-h-[500px]"
        )}
        collapsible="none"
      >
        <div className="flex h-full flex-col items-center py-4 relative">
          {/* Toggle arrow button */}
          <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {expanded ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          <div
            className={cn(
              "flex flex-1 flex-col items-center justify-center space-y-4",
              expanded && "items-start w-full px-3"
            )}
          >
            {navItems.map((item) => (
              <NavItem
                key={item.href}
                icon={item.icon}
                href={item.href}
                label={item.label}
                isActive={activeItem === item.href}
                onClick={() => setActiveItem(item.href)}
                expanded={expanded}
              />
            ))}
          </div>

          {/* User Profile at bottom */}
          <div className="mt-auto pt-4 border-t border-border/50">
            <div className={cn(
              "flex items-center justify-center",
              expanded && "w-full px-3"
            )}>
              {expanded ? (
                <div className="flex items-center w-full p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <div className="scale-90 origin-left">
                    <UserNav />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <div className="scale-75">
                    <UserNav />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Sidebar>
    </TooltipProvider>
  );
}

function NavItem({ icon: Icon, href, label, isActive, onClick, expanded }) {
  const isCreatePost = label === "Create Post";

  return expanded ? (
    <Link
      href={href}
      className={cn(
        "flex items-center w-full p-2 rounded-md text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50",
        isActive &&
          "bg-primary/20 text-primary font-medium border-l-4 border-primary pl-1",
        isCreatePost &&
          "bg-primary text-primary-foreground py-3 hover:bg-primary/90 hover:text-primary-foreground"
      )}
      onClick={onClick}
    >
      <Icon
        className={cn("h-5 w-5 mr-3 flex-shrink-0", isActive && "text-primary")}
      />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  ) : (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className={cn(
            "flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground",
            isActive && "bg-primary/20 text-primary border-l-4 border-primary",
            isCreatePost
              ? "bg-primary text-primary-foreground h-12 w-12 hover:bg-primary/90 hover:text-primary-foreground"
              : "h-10 w-10"
          )}
          onClick={onClick}
        >
          <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
          <span className="sr-only">{label}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
