"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { format } from "date-fns";
import {
  Instagram,
  Twitter,
  Facebook,
  AtSign,
  Youtube,
  Clock,
} from "lucide-react";
import { usePostStore } from "@/app/lib/store/postStore";
import { useUIStateStore } from "@/app/lib/store/uiStateStore"; // Import UIStateStore
import { SelectedAccountsPreview } from "../selectAccount/SelectedAccountsPreview";

// Placeholder for TikTok Icon (can be shared if not already)
const TikTokIcon = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.38 1.92-3.64 2.96-5.66 2.96-1.91 0-3.8-.73-5.17-1.99-1.01-.93-1.56-2.2-1.56-3.56 0-.19.01-.38.02-.57-.01-.01.01-.02.01-.02.01-.19.01-.38.02-.57.08-1.56.63-3.12 1.74-4.21 1.12-1.09 2.7-1.61 4.24-1.78l.01-4.03c-1.44.05-2.89.35-4.2.97-.57-.26-1.1-.59-1.62-.93-.01-2.92-.01-5.84.02-8.75.08-1.4.54-2.79 1.35-3.94C7.12 1.2 9.38.16 11.4.16c.38 0 .77.01 1.14.06z" />
  </svg>
);

// Placeholder for Bluesky Icon (can be shared if not already)
const BlueskyIcon = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M19.965 5.834c-1.518-.005-3.037.005-4.555.029.035 1.488.373 2.961 1.011 4.305.67 1.404 1.631 2.607 2.84 3.498 1.18.866 2.55 1.416 3.977 1.637l.007.001v3.917c-1.616-.044-3.201-.4-4.655-1.043a14.12 14.12 0 0 1-3.06-1.979c-1.118-.925-2.08-2.05-2.833-3.328-.743-1.26-1.27-2.66-1.547-4.135H4.035c1.518.005 3.037-.005 4.555-.029-.035-1.488-.373-2.961-1.011-4.305-.67-1.404-1.631-2.607-2.84-3.498-1.18-.866-2.55-1.416-3.977-1.637l-.007-.001V.083c1.616.044 3.201.4 4.655 1.043a14.12 14.12 0 0 1 3.06 1.979c1.118.925 2.08 2.05 2.833 3.328.743 1.26 1.27 2.66 1.547 4.135h5.117z" />
  </svg>
);

const platformConfig = {
  instagram: { name: "Instagram", Icon: Instagram, color: "#E1306C" },
  twitter: { name: "Twitter (X)", Icon: Twitter, color: "#1DA1F2" },
  facebook: { name: "Facebook", Icon: Facebook, color: "#1877F2" },
  threads: { name: "Threads", Icon: AtSign, color: "#000000" },
  tiktok: { name: "TikTok", Icon: TikTokIcon, color: "#000000" },
  ytShorts: { name: "YouTube Shorts", Icon: Youtube, color: "#FF0000" },
  bluesky: { name: "Bluesky", Icon: BlueskyIcon, color: "#007AFF" },
  // Add other platforms as needed
};

export function TextPreview() {
  // Use textPostContent from UIStateStore instead of temporaryText
  const textPostContent = useUIStateStore((state) => state.textPostContent);

  // --- Post Store State ---
  const scheduleType = usePostStore((state) => state.scheduleType);
  const scheduledAt = usePostStore((state) => state.scheduledAt);
  const selectedAccounts = usePostStore((state) => state.selectedAccounts);
  // ----------------------

  const [activePlatform, setActivePlatform] = useState(null);

  const formattedScheduledDateTime = useMemo(() => {
    if (scheduleType === "scheduled" && scheduledAt) {
      try {
        return format(new Date(scheduledAt), "MMM d, yyyy 'at' h:mm a");
      } catch (error) {
        console.error("Error formatting date:", error, "Value:", scheduledAt);
        return "Invalid Date";
      }
    } else if (scheduleType === "immediate") {
      return "Immediately";
    } else {
      return "Not scheduled";
    }
  }, [scheduleType, scheduledAt]);

  const uniquePlatforms = useMemo(() => {
    return [...new Set(selectedAccounts.map((account) => account.platform))];
  }, [selectedAccounts]);

  useEffect(() => {
    if (!activePlatform && uniquePlatforms.length > 0) {
      setActivePlatform(uniquePlatforms[0]);
    } else if (activePlatform && !uniquePlatforms.includes(activePlatform)) {
      setActivePlatform(uniquePlatforms[0] || null);
    }
  }, [uniquePlatforms, activePlatform]);

  // Use textPostContent as the main content
  const currentContent = textPostContent || "";
  const CurrentPlatformIcon = activePlatform
    ? platformConfig[activePlatform]?.Icon
    : null;

  // No preview if no text and no accounts selected
  if (textPostContent.trim() === "" && selectedAccounts.length === 0) {
    return (
      <Card className="lg:w-1/3 xl:w-1/4 hidden lg:block h-fit sticky top-24">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Add text and select accounts to see preview.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:w-1/3 xl:w-1/4 hidden lg:block h-fit sticky top-24 overflow-hidden border shadow-sm">
      <CardHeader className="border-b bg-muted/30 py-3 px-4">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <span>Text Preview</span>
          {uniquePlatforms.length > 1 && (
            <select
              value={activePlatform || ""}
              onChange={(e) => setActivePlatform(e.target.value)}
              className="text-xs p-1 rounded border bg-background text-foreground ml-2"
            >
              {uniquePlatforms.map((p) => (
                <option key={p} value={p}>
                  {platformConfig[p]?.name || p}
                </option>
              ))}
            </select>
          )}
          {uniquePlatforms.length === 1 &&
            activePlatform &&
            CurrentPlatformIcon && (
              <span className="flex items-center gap-1.5 text-xs ml-2 text-muted-foreground">
                <CurrentPlatformIcon className="h-3 w-3" />
                {platformConfig[activePlatform]?.name}
              </span>
            )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <SelectedAccountsPreview accounts={selectedAccounts} />

        {/* Text Content Preview Area */}
        <div className="aspect-square w-full bg-muted/10 rounded-md overflow-y-auto p-3 flex items-start justify-start ">
          {currentContent ? (
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
              {currentContent}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No text entered yet...
            </p>
          )}
        </div>

        {/* Schedule Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t mt-auto">
          <Clock className="h-3.5 w-3.5" />
          <span>{formattedScheduledDateTime}</span>
        </div>
      </CardContent>
    </Card>
  );
}
