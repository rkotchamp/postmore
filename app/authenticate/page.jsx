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
import { PlatformConsentMessages } from "./components/PlatformConsentMessages";
import { Skeleton } from "@/app/components/ui/skeleton";

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
  const [platformConsentAcknowledged, setPlatformConsentAcknowledged] =
    useState({});

  const emptyAccounts = {
    instagram: [],
    twitter: [],
    facebook: [],
    threads: [],
    ytShorts: [],
    tiktok: [],
    bluesky: [],
    linkedin: [],
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

  // Fetch platform consent acknowledgments
  const fetchPlatformConsent = async () => {
    try {
      const response = await fetch("/api/auth/platform-consent");
      if (response.ok) {
        const data = await response.json();
        setPlatformConsentAcknowledged(data.platformConsentAcknowledged || {});
      }
    } catch (error) {
      console.error("Error fetching platform consent:", error);
    }
  };

  // Update platform consent when user starts connection
  const updatePlatformConsent = async (platform) => {
    try {
      const response = await fetch("/api/auth/platform-consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ platform }),
      });

      if (response.ok) {
        setPlatformConsentAcknowledged((prev) => ({
          ...prev,
          [platform]: true,
        }));
      }
    } catch (error) {
      console.error("Error updating platform consent:", error);
    }
  };

  useEffect(() => {
    // Fetch platform consent acknowledgments on component mount
    fetchPlatformConsent();

    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    const platform = params.get("platform");
    const message = params.get("message");
    const code = params.get("code");
    const state = params.get("state");
    const debug = params.get("debug");
    const response = params.get("response");

    // Handle platform-specific callback parameters
    if (platform && (success || error)) {
      if (platform === "instagram") {
        if (success === "true") {
          const username = params.get("username");
          setAuthStatus({
            type: "success",
            platform: "instagram",
            message: username 
              ? `Connected to Instagram account @${username} successfully!`
              : "Connected to Instagram successfully!",
          });
          // Refetch accounts to show the new Instagram account
          refetchAccounts();
        } else if (error) {
          console.error("Instagram authentication error:", error, debug);
          const debugInfo = params.get("debugInfo");
          let debugMessage = error || "Failed to connect to Instagram";
          
          if (debugInfo) {
            try {
              const parsed = JSON.parse(debugInfo);
              debugMessage = `${error}\n\nDEBUG INFO:\n• Pages found: ${parsed.pagesFound?.length || 0}\n• Token valid: ${parsed.tokenValid ? 'Yes' : 'No'}\n• Graph API: ${parsed.graphApiVersion}\n• Timestamp: ${parsed.timestamp}`;
              
              if (parsed.pagesFound?.length > 0) {
                debugMessage += `\n• Page details: ${parsed.pagesFound.map(p => `${p.name} (${p.hasAccessToken ? 'has token' : 'no token'})`).join(', ')}`;
              }
            } catch (e) {
              debugMessage += `\n\nRaw debug: ${debugInfo}`;
            }
          }
          
          setAuthStatus({
            type: "error",
            platform: "instagram",
            message: debugMessage,
          });
          // Refetch accounts even on error to ensure TanStack Query state is updated
          refetchAccounts();
        }
      } else if (platform === "tiktok") {
        if (success === "true") {
          if (debug === "true" && response) {
            setAuthStatus({
              type: "success",
              platform: "tiktok",
              message: `TikTok debug response: ${response}`,
            });
          } else {
            setAuthStatus({
              type: "success",
              platform: "tiktok",
              message: "Connected to TikTok successfully!",
            });
          }
        } else if (error) {
          console.error("TikTok authentication error:", error, message);
          setAuthStatus({
            type: "error",
            platform: "tiktok",
            message: message || `Failed to connect to TikTok: ${error}`,
          });
        } else if (code) {
          setAuthStatus({
            type: "success",
            platform: "tiktok",
            message: "Received TikTok authorization code!",
          });
        }
      }

      // Clean up URL parameters after processing
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, document.title, url.toString());
    }
  }, []);

  const handleInstagramConnection = async () => {
    setIsLoadingAuthAction(true);
    setAuthStatus(null);

    // Update platform consent acknowledgment
    await updatePlatformConsent("instagram");

    try {
      const response = await fetch("/api/auth/instagram/connect");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to get Instagram authorization URL"
        );
      }

      if (data.authorizeUrl) {
        window.location.href = data.authorizeUrl;
      } else {
        throw new Error("Authorization URL not received from server.");
      }
    } catch (error) {
      console.error("Error initiating Instagram connection:", error);
      setAuthStatus({
        type: "error",
        platform: "instagram",
        message: `Failed to connect Instagram: ${error.message}`,
      });
      setIsLoadingAuthAction(false);
    }
  };

  const handleTwitterConnection = async () => {
    // Update platform consent acknowledgment
    await updatePlatformConsent("twitter");
    // Integration code would go here
  };

  const handleFacebookConnection = async () => {
    // Update platform consent acknowledgment
    await updatePlatformConsent("facebook");
    // Integration code would go here
  };

  const handleThreadsConnection = async () => {
    // Update platform consent acknowledgment
    await updatePlatformConsent("threads");
    // Integration code would go here
  };

  const handleYtShortsConnection = async () => {
    setIsLoadingAuthAction(true);
    setAuthStatus(null);

    // Update platform consent acknowledgment
    await updatePlatformConsent("ytShorts");

    try {
      const response = await fetch("/api/auth/youtube/connect");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to get YouTube authorization URL"
        );
      }

      if (data.authorizeUrl) {
        window.location.href = data.authorizeUrl;
      } else {
        throw new Error("Authorization URL not received from server.");
      }
    } catch (error) {
      console.error("Error initiating YouTube connection:", error);
      setAuthStatus({
        type: "error",
        platform: "ytShorts",
        message: `Failed to connect YouTube: ${error.message}`,
      });
      setIsLoadingAuthAction(false);
    }
  };

  const handleTikTokAuth = async () => {
    setIsLoadingAuthAction(true);
    setAuthStatus(null);

    // Update platform consent acknowledgment
    await updatePlatformConsent("tiktok");

    try {
      const stateToken = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("tiktok_auth_state", stateToken);

      if (
        !process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID ||
        !process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI
      ) {
        throw new Error(
          "TikTok client ID or redirect URI is not configured in environment variables."
        );
      }

      // Generate PKCE parameters for TikTok OAuth
      const generateCodeVerifier = () => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode.apply(null, array))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
      };

      const generateCodeChallenge = async (verifier) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const hashedValue = await crypto.subtle.digest('SHA-256', data);
        // TikTok requires hex encoding, not base64url like other providers
        return Array.from(new Uint8Array(hashedValue))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      };

      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Store code verifier for the callback
      localStorage.setItem("tiktok_code_verifier", codeVerifier);

      const baseUrl = "https://www.tiktok.com/v2/auth/authorize/";

      // Use client-side callback handler to access localStorage
      const clientRedirectUri = `${window.location.origin}/authenticate/tiktok-callback`;

      const params = {
        client_key: process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID,
        redirect_uri: clientRedirectUri,
        response_type: "code",
        scope: "user.info.basic,video.list,video.publish",
        state: stateToken,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        prompt: "select_account",
        force_authentication: "true",
      };

      const searchParams = new URLSearchParams(params);

      const authUrl = `${baseUrl}?${searchParams.toString()}`;

      // Redirect to TikTok OAuth (sensitive params removed from logs for security)
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

  const handleBlueskyAuth = async () => {
    setAuthStatus(null);
    setBlueskyLoginError(null);

    // Update platform consent acknowledgment
    await updatePlatformConsent("bluesky");

    setIsBlueskyModalOpen(true);
  };

  const handleLinkedInConnection = async () => {
    setIsLoadingAuthAction(true);
    setAuthStatus(null);

    // Update platform consent acknowledgment
    await updatePlatformConsent("linkedin");

    try {
      const response = await fetch("/api/auth/linkedin/connect");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to get LinkedIn authorization URL"
        );
      }

      if (data.authorizeUrl) {
        window.location.href = data.authorizeUrl;
      } else {
        throw new Error("Authorization URL not received from server.");
      }
    } catch (error) {
      console.error("Error initiating LinkedIn connection:", error);
      setAuthStatus({
        type: "error",
        platform: "linkedin",
        message: `Failed to connect LinkedIn: ${error.message}`,
      });
      setIsLoadingAuthAction(false);
    }
  };

  const handleBlueskyLoginSubmit = async (credentials) => {
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
    linkedin: handleLinkedInConnection,
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
      case "linkedin":
        return <LinkedInIcon {...iconProps} />;
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

  const LinkedInIcon = ({ className }) => (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
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
    linkedin: "LinkedIn",
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

  // Remove the dependency on loading state - let the page load regardless

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

        {accountsError && (
          <Alert className="max-w-4xl mx-auto mb-4" variant="default">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <AlertTitle className="text-sm font-medium">
                Loading Accounts
              </AlertTitle>
            </div>
            <AlertDescription className="mt-1 text-sm">
              Having trouble loading your connected accounts. You can still
              connect new accounts below.
            </AlertDescription>
          </Alert>
        )}

        {isLoadingAccounts ? (
          <div className="max-w-4xl mx-auto space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between py-4 px-4 bg-primary/10">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex items-center ml-auto">
                    <div className="flex -space-x-2">
                      <Skeleton className="h-6 w-6 rounded-full border-2 border-background" />
                      <Skeleton className="h-6 w-6 rounded-full border-2 border-background" />
                      <Skeleton className="h-6 w-6 rounded-full border-2 border-background" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
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
                    <span className="font-medium">
                      {platformNames[platform]}
                    </span>
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
                          (isLoadingAuthAction && platform === "bluesky") ||
                          (isLoadingAuthAction && platform === "ytShorts") ||
                          (isLoadingAuthAction && platform === "instagram") ||
                          (isLoadingAuthAction && platform === "linkedin")
                        }
                      >
                        <PlatformIcon platform={platform} />
                        {(isLoadingAuthAction && platform === "tiktok") ||
                        (isLoadingAuthAction && platform === "bluesky") ||
                        (isLoadingAuthAction && platform === "ytShorts") ||
                        (isLoadingAuthAction && platform === "instagram") ||
                        (isLoadingAuthAction && platform === "linkedin")
                          ? "Connecting..."
                          : `Connect a ${platformNames[platform]} Account`}
                      </Button>

                      {!platformConsentAcknowledged[platform] && (
                        <PlatformConsentMessages platform={platform} />
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

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
