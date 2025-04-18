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
import { DisconnectDialog } from "./components/DisconnectDialog";

// Initialize empty accounts structure
const emptyAccounts = {
  instagram: [],
  twitter: [],
  facebook: [],
  threads: [],
  ytShorts: [],
  tiktok: [],
};

export default function Authenticate() {
  const [connectedAccounts, setConnectedAccounts] = useState(emptyAccounts);
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectDialog, setDisconnectDialog] = useState({
    isOpen: false,
    platform: "",
    accountId: "",
    accountName: "",
    platformAccountId: "",
  });

  // Fetch all social accounts when component mounts
  useEffect(() => {
    fetchSocialAccounts();
  }, []);

  // Function to fetch all social accounts
  const fetchSocialAccounts = async () => {
    try {
      const response = await fetch("/api/social-accounts");
      if (!response.ok) {
        throw new Error("Failed to fetch social accounts");
      }

      const data = await response.json();

      // Transform and sort accounts by platform
      const sortedAccounts = { ...emptyAccounts };

      data.accounts?.forEach((account) => {
        if (sortedAccounts[account.platform]) {
          sortedAccounts[account.platform].push({
            id: account._id,
            name: account.displayName || "Unknown User",
            email: account.platformUsername || account.platformAccountId,
            imageUrl: account.profileImage || "/avatars/placeholder.jpg",
            platformAccountId: account.platformAccountId,
          });
        }
      });

      setConnectedAccounts(sortedAccounts);
    } catch (error) {
      console.error("Error fetching social accounts:", error);
      // You might want to show an error message to the user here
    }
  };

  // Updated disconnect handling
  const handleDisconnectClick = (
    platform,
    accountId,
    accountName,
    platformAccountId
  ) => {
    setDisconnectDialog({
      isOpen: true,
      platform,
      accountId,
      accountName,
      platformAccountId,
    });
  };

  const handleDisconnectConfirm = async () => {
    const { platform, accountId, platformAccountId } = disconnectDialog;

    if (isDisconnecting) return;

    setIsDisconnecting(true);
    try {
      const response = await fetch(`/api/social-accounts/${accountId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform,
          platformAccountId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect account");
      }

      // Update local state to remove the disconnected account
      setConnectedAccounts((prev) => ({
        ...prev,
        [platform]: prev[platform].filter(
          (account) => account.id !== accountId
        ),
      }));

      // Show success message
      setAuthStatus({
        type: "success",
        platform,
        message: `Successfully disconnected ${platform} account`,
      });
    } catch (error) {
      console.error(`Error disconnecting ${platform} account:`, error);
      setAuthStatus({
        type: "error",
        platform,
        message: `Failed to disconnect ${platform} account: ${error.message}`,
      });
    } finally {
      setIsDisconnecting(false);
      setDisconnectDialog((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleDisconnectCancel = () => {
    setDisconnectDialog((prev) => ({ ...prev, isOpen: false }));
  };

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

  // Function to initiate TikTok authentication
  const handleTikTokAuth = async () => {
    console.log("Initiating TikTok authentication");
    setIsLoading(true);
    setAuthStatus(null);

    try {
      // 1. Generate a state token for CSRF protection
      const stateToken = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("tiktok_auth_state", stateToken);
      console.log("Generated state token:", stateToken);

      // 2. Construct the TikTok authorization URL
      if (
        !process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID ||
        !process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI
      ) {
        throw new Error(
          "TikTok client ID or redirect URI is not configured in environment variables."
        );
      }

      // Base URL for TikTok authorization
      const baseUrl = "https://www.tiktok.com/v2/auth/authorize/";

      // Define parameters
      const params = {
        client_key: process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID,
        redirect_uri: process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI,
        response_type: "code",
        scope: "user.info.basic,video.list,video.publish", // Request necessary scopes
        state: stateToken,
        prompt: "select_account", // Force account selection
        force_authentication: "true", // Force full auth flow
      };

      // Create URLSearchParams object
      const searchParams = new URLSearchParams(params);

      // Construct the full authorization URL
      const authUrl = `${baseUrl}?${searchParams.toString()}`;

      console.log("Constructed TikTok Auth URL:", authUrl);

      // 3. Redirect the user to the TikTok authorization page
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error initiating TikTok authentication:", error);
      setAuthStatus({
        type: "error",
        platform: "tiktok",
        message:
          error.message || "An unexpected error occurred during TikTok auth.",
      });
      setIsLoading(false);
    }
  };

  const connectionHandlers = {
    instagram: handleInstagramConnection,
    twitter: handleTwitterConnection,
    facebook: handleFacebookConnection,
    threads: handleThreadsConnection,
    ytShorts: handleYtShortsConnection,
    tiktok: handleTikTokAuth,
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

        {/* Show auth status messages */}
        {authStatus && (
          <Alert
            className="max-w-4xl mx-auto mb-4"
            variant={authStatus.type === "error" ? "destructive" : "default"}
          >
            <div className="flex items-center gap-2">
              {authStatus.type === "error" ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertTitle className="text-sm font-medium">
                {authStatus.type === "error" ? "Error" : "Success"}
              </AlertTitle>
            </div>
            <AlertDescription className="mt-1 text-sm">
              {authStatus.message}
            </AlertDescription>
          </Alert>
        )}

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
                              handleDisconnectClick(
                                platform,
                                account.id,
                                account.name,
                                account.platformAccountId
                              )
                            }
                            disabled={isDisconnecting}
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

                    {/* Platform-specific disclaimers */}
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

        {/* Add the DisconnectDialog */}
        <DisconnectDialog
          isOpen={disconnectDialog.isOpen}
          onClose={handleDisconnectCancel}
          onConfirm={handleDisconnectConfirm}
          platform={disconnectDialog.platform}
          accountName={disconnectDialog.accountName}
          isLoading={isDisconnecting}
        />
      </div>
    </DashboardLayout>
  );
}
