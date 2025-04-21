"use client";

import { useState, useEffect } from "react";
import { useFetchAllAccountsContext } from "@/app/context/FetchAllAccountsContext";
import { BskyAgent } from "@atproto/api";
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
import Spinner from "@/app/components/ui/Spinner";
import { BlueskyLoginModal } from "./components/BlueskyLoginModal";

export default function Authenticate() {
  const {
    accounts: allAccounts,
    isLoading: isLoadingAccounts,
    error: accountsError,
    refetch: refetchAccounts,
  } = useFetchAllAccountsContext();

  const [isLoadingAuthAction, setIsLoadingAuthAction] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectDialog, setDisconnectDialog] = useState({
    isOpen: false,
    platform: "",
    accountId: "",
    accountName: "",
    platformAccountId: "",
  });

  const [isBlueskyModalOpen, setIsBlueskyModalOpen] = useState(false);
  const [blueskyLoginError, setBlueskyLoginError] = useState(null);

  const emptyAccounts = {
    instagram: [],
    twitter: [],
    facebook: [],
    threads: [],
    ytShorts: [],
    tiktok: [],
    bluesky: [],
  };

  const connectedAccounts =
    allAccounts?.reduce(
      (acc, account) => {
        if (acc[account.platform]) {
          acc[account.platform].push({
            id: account._id,
            name: account.displayName || "Unknown User",
            email: account.platformUsername || account.platformAccountId,
            imageUrl: account.profileImage || "/avatars/placeholder.jpg",
            platformAccountId: account.platformAccountId,
          });
        }
        return acc;
      },
      { ...emptyAccounts }
    ) || emptyAccounts;

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

      await refetchAccounts();

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

  useEffect(() => {
    console.log("Checking URL for auth status params");

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

        console.log(
          "Authentication successful - React Query context manages fetching"
        );
      } else if (error) {
        console.error("TikTok authentication error:", error, message);
        setAuthStatus({
          type: "error",
          platform: "tiktok",
          message: message || `Failed to connect to TikTok: ${error}`,
        });
      } else if (code) {
        console.log("Received authorization code from TikTok:", code);
        setAuthStatus({
          type: "success",
          platform: "tiktok",
          message: "Received TikTok authorization code!",
        });
      }

      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, document.title, url.toString());
    }
  }, []);

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

  const handleTikTokAuth = async () => {
    console.log("Initiating TikTok authentication");
    setIsLoadingAuthAction(true);
    setAuthStatus(null);

    try {
      const stateToken = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("tiktok_auth_state", stateToken);
      console.log("Generated state token:", stateToken);

      if (
        !process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID ||
        !process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI
      ) {
        throw new Error(
          "TikTok client ID or redirect URI is not configured in environment variables."
        );
      }

      const baseUrl = "https://www.tiktok.com/v2/auth/authorize/";

      const params = {
        client_key: process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID,
        redirect_uri: process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI,
        response_type: "code",
        scope: "user.info.basic,video.list,video.publish",
        state: stateToken,
        prompt: "select_account",
        force_authentication: "true",
      };

      const searchParams = new URLSearchParams(params);

      const authUrl = `${baseUrl}?${searchParams.toString()}`;

      console.log("Constructed TikTok Auth URL:", authUrl);

      window.location.href = authUrl;
    } catch (error) {
      console.error("Error initiating TikTok authentication:", error);
      setAuthStatus({
        type: "error",
        platform: "tiktok",
        message:
          error.message || "An unexpected error occurred during TikTok auth.",
      });
      setIsLoadingAuthAction(false);
    }
  };

  const handleBlueskyAuth = () => {
    console.log("Opening Bluesky login modal...");
    setAuthStatus(null);
    setBlueskyLoginError(null);
    setIsBlueskyModalOpen(true);
  };

  const handleBlueskyLoginSubmit = async (credentials) => {
    console.log("Submitting Bluesky credentials:", credentials.identifier);
    setIsLoadingAuthAction(true);
    setBlueskyLoginError(null);
    setAuthStatus(null);

    try {
      const response = await fetch("/api/auth/bluesky/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: credentials.identifier,
          password: credentials.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Bluesky login failed");
      }

      console.log("Bluesky login successful:", data);
      setAuthStatus({
        type: "success",
        platform: "bluesky",
        message: data.message || "Connected to Bluesky successfully!",
      });
      setIsBlueskyModalOpen(false);
      await refetchAccounts();
    } catch (error) {
      console.error("Bluesky login failed:", error);
      const errorMessage = error.message || "An unexpected error occurred.";
      setBlueskyLoginError(errorMessage);
      setAuthStatus({
        type: "error",
        platform: "bluesky",
        message: `Bluesky Connection Error: ${errorMessage}`,
      });
    } finally {
      setIsLoadingAuthAction(false);
    }
  };

  const connectionHandlers = {
    instagram: handleInstagramConnection,
    twitter: handleTwitterConnection,
    facebook: handleFacebookConnection,
    threads: handleThreadsConnection,
    ytShorts: handleYtShortsConnection,
    tiktok: handleTikTokAuth,
    bluesky: handleBlueskyAuth,
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
      case "bluesky":
        return <BlueskyIcon {...iconProps} />;
      default:
        return null;
    }
  };

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

  const BlueskyIcon = ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" />
      <path d="M17 12c0 2.8-2.2 5-5 5s-5-2.2-5-5 2.2-5 5-5 5 2.2 5 5Z" />
      <path d="M12 7v0" />
    </svg>
  );

  const platformNames = {
    instagram: "Instagram",
    twitter: "Twitter",
    facebook: "Facebook",
    threads: "Threads",
    ytShorts: "YouTube Shorts",
    tiktok: "TikTok",
    bluesky: "Bluesky",
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

  if (isLoadingAccounts) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center h-full">
          <Spinner />
        </div>
      </DashboardLayout>
    );
  }

  if (accountsError) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center text-red-500">
          Error loading accounts: {accountsError.message}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 max-w-4xl mx-auto">
          Connected Accounts
        </h1>

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

                  <div className="mt-6">
                    <Button
                      className="w-full py-6 text-base flex items-center gap-2"
                      onClick={connectionHandlers[platform]}
                      disabled={
                        (isLoadingAuthAction && platform === "tiktok") ||
                        (isLoadingAuthAction && platform === "bluesky")
                      }
                    >
                      <PlatformIcon platform={platform} />
                      {(isLoadingAuthAction && platform === "tiktok") ||
                      (isLoadingAuthAction && platform === "bluesky")
                        ? "Connecting..."
                        : `Connect to ${platformNames[platform]}`}
                    </Button>

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

        <DisconnectDialog
          isOpen={disconnectDialog.isOpen}
          onClose={handleDisconnectCancel}
          onConfirm={handleDisconnectConfirm}
          platform={disconnectDialog.platform}
          accountName={disconnectDialog.accountName}
          isLoading={isDisconnecting}
        />

        <BlueskyLoginModal
          isOpen={isBlueskyModalOpen}
          onClose={() => {
            if (!isLoadingAuthAction) {
              setIsBlueskyModalOpen(false);
            }
          }}
          onSubmit={handleBlueskyLoginSubmit}
          isLoading={isLoadingAuthAction}
          error={blueskyLoginError}
        />
      </div>
    </DashboardLayout>
  );
}
