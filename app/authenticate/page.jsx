"use client";

import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";
import {
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  X,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";
import { Username } from "./components/Username";
import { Button } from "@/app/components/ui/button";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/app/components/ui/avatar";
import { DashboardLayout } from "@/app/dashboard/components/dashboard-layout";
import { Alert, AlertTitle, AlertDescription } from "@/app/components/ui/alert";

// Dummy data for connected accounts
const initialAccounts = {
  instagram: [
    {
      id: 1,
      name: "Bessie Cooper",
      email: "bessie@example.com",
      imageUrl: "/avatars/bessie.jpg",
    },
    {
      id: 2,
      name: "Jenny Wilson",
      email: "jenny@example.com",
      imageUrl: "/avatars/jenny.jpg",
    },
  ],
  twitter: [
    {
      id: 3,
      name: "John Doe",
      email: "john@example.com",
      imageUrl: "/avatars/john.jpg",
    },
  ],
  facebook: [
    {
      id: 4,
      name: "Sarah Smith",
      email: "sarah@example.com",
      imageUrl: "/avatars/sarah.jpg",
    },
    {
      id: 5,
      name: "Mike Johnson",
      email: "mike@example.com",
      imageUrl: "/avatars/mike.jpg",
    },
  ],
  threads: [
    {
      id: 6,
      name: "Alex Brown",
      email: "alex@example.com",
      imageUrl: "/avatars/alex.jpg",
    },
  ],
  ytShorts: [
    {
      id: 7,
      name: "Emma Davis",
      email: "emma@example.com",
      imageUrl: "/avatars/emma.jpg",
    },
  ],
  tiktok: [], // Add empty TikTok accounts array
};

export default function Authenticate() {
  const [connectedAccounts, setConnectedAccounts] = useState(initialAccounts);
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);

  // Check for success/error messages in URL after redirect
  useEffect(() => {
    console.log("Checking URL for auth status params");

    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    const platform = params.get("platform");
    const message = params.get("message");
    const code = params.get("code");
    const state = params.get("state");
    const debug = params.get("debug");
    const response = params.get("response");

    console.log("Auth redirect params:", {
      success,
      error,
      platform,
      message,
      code,
      state,
      debug,
      response,
      allParams: Object.fromEntries(params.entries()),
    });

    if (platform === "tiktok") {
      if (success === "true") {
        console.log("TikTok authentication successful");

        // Check if we have debug information to display
        if (debug === "true" && response) {
          setAuthStatus({
            type: "success",
            platform: "tiktok",
            message: `TikTok debug response: ${response}`,
          });
          console.log("Debug response:", response);
        } else {
          setAuthStatus({
            type: "success",
            platform: "tiktok",
            message: "Connected to TikTok successfully!",
          });
        }

        // Don't fetch accounts immediately - just log success
        console.log("Authentication successful - would fetch accounts here");
        // fetchTikTokAccounts(); - commented out
      } else if (error) {
        console.error("TikTok authentication error:", error, message);
        setAuthStatus({
          type: "error",
          platform: "tiktok",
          message: message || `Failed to connect to TikTok: ${error}`,
        });
      } else if (code) {
        // Handle direct code response from TikTok
        console.log("Received authorization code from TikTok:", code);
        setAuthStatus({
          type: "success",
          platform: "tiktok",
          message: "Received TikTok authorization code!",
        });
      }

      // Clean up URL parameters
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, document.title, url.toString());
    }
  }, []);

  // Function to fetch TikTok accounts from the server
  const fetchTikTokAccounts = async () => {
    console.log("Fetching TikTok accounts");
    try {
      // Check if we're in test mode from URL parameter
      const params = new URLSearchParams(window.location.search);
      const testMode = params.get("testmode") === "true";

      // Add testmode parameter if needed
      const queryString = testMode
        ? "platform=tiktok&testmode=true"
        : "platform=tiktok";
      const response = await fetch(`/api/social-accounts?${queryString}`);

      if (response.ok) {
        const data = await response.json();
        console.log("TikTok accounts fetched:", data);

        // Update connected accounts state
        if (data.accounts && data.accounts.length > 0) {
          const tiktokAccounts = data.accounts.map((account) => ({
            id: account._id,
            name: account.displayName,
            email: account.platformUsername || "TikTok User",
            imageUrl: account.profileImage || "/avatars/placeholder.jpg",
          }));

          setConnectedAccounts((prev) => ({
            ...prev,
            tiktok: tiktokAccounts,
          }));
        }
      } else {
        console.error(
          "Failed to fetch TikTok accounts:",
          await response.text()
        );
      }
    } catch (error) {
      console.error("Error fetching TikTok accounts:", error);
    }
  };

  const handleDisconnect = (platform, accountId) => {
    setConnectedAccounts((prev) => ({
      ...prev,
      [platform]: prev[platform].filter((account) => account.id !== accountId),
    }));
  };

  // Add connection handlers for each platform
  const handleInstagramConnection = () => {
    console.log("Connecting to Instagram...");
    // Integration code would go here
  };

  const handleTwitterConnection = () => {
    console.log("Connecting to Twitter...");
    // Integration code would go here
  };

  const handleFacebookConnection = () => {
    console.log("Connecting to Facebook...");
    // Integration code would go here
  };

  const handleThreadsConnection = () => {
    console.log("Connecting to Threads...");
    // Integration code would go here
  };

  const handleYtShortsConnection = () => {
    console.log("Connecting to YouTube Shorts...");
    // Integration code would go here
  };

  const handleTikTokConnection = async () => {
    setIsLoading(true);
    console.log("========== Initiating TikTok OAuth flow ==========");

    try {
      // Get the redirect URI from environment
      const redirectUri = process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI;
      if (!redirectUri) {
        throw new Error("Missing TikTok redirect URI configuration");
      }
      console.log("Redirect URI:", redirectUri);

      // Get client key from environment
      const clientKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID;
      if (!clientKey) {
        throw new Error("Missing TikTok client key configuration");
      }
      console.log("Client Key present");

      // Use only the required scope for basic functionality
      const scope = "user.info.basic,video.list";
      console.log("Using scopes:", scope);

      // Force disable sandbox mode
      console.log("Sandbox mode is forced OFF");

      // Use the production TikTok auth URL
      const authUrlBase = "https://www.tiktok.com/v2/auth/authorize/";
      console.log("Using TikTok auth URL:", authUrlBase);

      // Generate state parameter for CSRF protection
      const generateRandomString = (length) => {
        let result = "";
        const characters =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
          result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
          );
        }
        return result;
      };

      const state = generateRandomString(32);
      console.log("Generated state parameter for CSRF protection");

      // Store state for later verification
      localStorage.setItem("tiktok_auth_state", state);

      // Build the full authorization URL with all required parameters
      const url = `${authUrlBase}?client_key=${encodeURIComponent(
        clientKey
      )}&response_type=code&scope=${encodeURIComponent(
        scope
      )}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&state=${encodeURIComponent(state)}`;

      console.log(
        "Final TikTok OAuth URL (structure):",
        `${authUrlBase}?client_key=[REDACTED]&response_type=code&scope=${scope}&redirect_uri=${redirectUri}&state=[REDACTED]`
      );

      // Redirect the user to TikTok's authorization page
      console.log("Redirecting to TikTok authorization page...");
      window.location.href = url;
    } catch (error) {
      console.error("Error initiating TikTok connection:", error);
      setIsLoading(false);
      setAuthStatus({
        type: "error",
        platform: "tiktok",
        message: `Failed to initiate TikTok connection: ${error.message}`,
      });
    }
  };

  const connectionHandlers = {
    instagram: handleInstagramConnection,
    twitter: handleTwitterConnection,
    facebook: handleFacebookConnection,
    threads: handleThreadsConnection,
    ytShorts: handleYtShortsConnection,
    tiktok: handleTikTokConnection,
  };

  const PlatformIcon = ({ platform }) => {
    const iconProps = { className: "h-5 w-5" };
    switch (platform) {
      case "instagram":
        return <Instagram {...iconProps} />;
      case "twitter":
        return <Twitter {...iconProps} />;
      case "facebook":
        return <Facebook {...iconProps} />;
      case "threads":
        return <div className="h-5 w-5 text-sm font-bold">@</div>;
      case "ytShorts":
        return <Youtube {...iconProps} />;
      case "tiktok":
        return <TikTokIcon {...iconProps} />;
      default:
        return null;
    }
  };

  // TikTok logo component
  const TikTokIcon = ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M19.321 5.562a5.124 5.124 0 0 1-5.16-4.956h-3.364v14.88c0 1.767-1.436 3.204-3.204 3.204a3.204 3.204 0 0 1-3.204-3.204 3.204 3.204 0 0 1 3.204-3.204c.282 0 .553.044.813.116v-3.364a6.552 6.552 0 0 0-.813-.052A6.568 6.568 0 0 0 1.025 15.55 6.568 6.568 0 0 0 7.593 22.12a6.568 6.568 0 0 0 6.568-6.568V9.658a8.464 8.464 0 0 0 5.16 1.752v-3.364a5.113 5.113 0 0 1-3.137-1.053 5.177 5.177 0 0 1-1.602-2.084V4.9"
        fill="currentColor"
      />
    </svg>
  );

  const platformNames = {
    instagram: "Instagram",
    twitter: "Twitter",
    facebook: "Facebook",
    threads: "Threads",
    ytShorts: "YouTube Shorts",
    tiktok: "TikTok",
  };

  const AvatarGroup = ({ accounts, max = 3 }) => {
    const visibleAvatars = accounts.slice(0, max);
    const remainingCount = accounts.length - max;

    return (
      <div className="flex items-center ml-auto">
        <div className="flex -space-x-2">
          {visibleAvatars.map((account) => (
            <Avatar
              key={account.id}
              className="h-6 w-6 border-2 border-background"
            >
              <AvatarImage src={account.imageUrl} alt={account.name} />
              <AvatarFallback className="text-xs">
                {account.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        {remainingCount > 0 && (
          <span className="text-xs ml-1 text-muted-foreground font-medium">
            +{remainingCount}
          </span>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 max-w-4xl mx-auto">
          Connected Accounts
        </h1>

        <Accordion
          type="single"
          collapsible
          className="max-w-4xl mx-auto space-y-4"
        >
          {Object.entries(connectedAccounts).map(([platform, accounts]) => (
            <AccordionItem
              key={platform}
              value={platform}
              className="border rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="flex items-center gap-3 py-4 px-4 hover:no-underline bg-primary/10 text-foreground">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform={platform} />
                  <span className="font-medium">{platformNames[platform]}</span>
                </div>
                <AvatarGroup accounts={accounts} />
              </AccordionTrigger>
              <AccordionContent className="bg-background">
                <div className="py-4 px-4">
                  {accounts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {accounts.map((account) => (
                        <div
                          key={account.id}
                          className="flex items-center justify-between bg-muted/20 p-4 rounded-lg relative min-h-[80px] w-full"
                        >
                          <Username
                            name={account.name}
                            email={account.email}
                            imageUrl={account.imageUrl}
                            className="pr-12 max-w-[85%] overflow-hidden"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-0 right-0"
                            onClick={() =>
                              handleDisconnect(platform, account.id)
                            }
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No accounts connected
                    </p>
                  )}

                  {/* Connection button */}
                  <div className="mt-6">
                    <Button
                      className="w-full py-6 text-base flex items-center gap-2"
                      onClick={connectionHandlers[platform]}
                      disabled={isLoading && platform === "tiktok"}
                    >
                      <PlatformIcon platform={platform} />
                      {isLoading && platform === "tiktok"
                        ? "Connecting..."
                        : `Connect to ${platformNames[platform]}`}
                    </Button>

                    {/* TikTok-specific disclaimer */}
                    {platform === "tiktok" && (
                      <div className="mt-3 p-3 bg-muted/30 rounded-md text-xs text-muted-foreground">
                        <p className="font-semibold mb-1">
                          By connecting your TikTok account:
                        </p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>
                            You grant PostMore permission to post content on
                            your behalf
                          </li>
                          <li>
                            You can manage content posting settings from your
                            TikTok account at any time
                          </li>
                          <li>
                            All content will comply with TikTok's Content
                            Sharing Guidelines
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </DashboardLayout>
  );
}
