"use client";

import { useState, useEffect, useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";
import { Username } from "@/app/authenticate/components/Username";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Button } from "@/app/components/ui/button";
import {
  Instagram,
  Twitter,
  Facebook,
  AtSign,
  Youtube,
  Music,
} from "lucide-react";
import { useFetchAllAccountsContext } from "@/app/context/FetchAllAccountsContext";
import { useRouter } from "next/navigation";

// --- Add Icon Components from Authenticate/page.jsx ---
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
// --- End Icon Components ---

export function SelectAccount({ onSelectionChange }) {
  const router = useRouter();
  // Fetch accounts from context
  const { accounts, isLoading, error } = useFetchAllAccountsContext();

  // State for processed accounts grouped by platform
  const [processedPlatformAccounts, setProcessedPlatformAccounts] = useState(
    {}
  );
  // Track initialization separately from rendering
  const [initialized, setInitialized] = useState(false);
  const [expandedPlatforms, setExpandedPlatforms] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState({});

  // One-time initialization
  useEffect(() => {
    if (initialized || isLoading || error) return;

    // --- Process fetched accounts into the required structure ---
    const groupedAccounts = {};
    accounts.forEach((account) => {
      const platform = account.platform; // Assuming account object has a 'platform' field
      if (!groupedAccounts[platform]) {
        groupedAccounts[platform] = [];
      }
      // Assuming account object has 'id', 'name', 'email', 'imageUrl'
      // Adapt these fields based on your actual account data structure
      groupedAccounts[platform].push({
        id: account._id || account.id, // Prioritize _id based on Authenticate/page.jsx
        name: account.displayName || "Unnamed Account", // Use displayName, fallback to "Unnamed Account"
        email: account.platformUsername || account.platformAccountId || "", // Use platformUsername or platformAccountId
        imageUrl: account.profileImage || "/avatars/placeholder.jpg", // Use profileImage, fallback to placeholder
        // Keep the original account data for later use if needed
        originalData: account,
      });
    });
    setProcessedPlatformAccounts(groupedAccounts);
    // --- End processing ---

    // Create initial selection object based on processed accounts
    const initialSelection = {};
    Object.keys(groupedAccounts).forEach((platform) => {
      initialSelection[platform] = {};
      groupedAccounts[platform].forEach((account) => {
        initialSelection[platform][account.id.toString()] = false;
      });
    });

    // Set state without triggering other effects
    setSelectedAccounts(initialSelection);
    // Mark initialization complete
    setInitialized(true);
  }, [initialized, accounts, isLoading, error]);

  // --- Handle Loading and Error States ---
  if (isLoading) {
    return <div className="p-4 text-center">Loading accounts...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        Error loading accounts: {error.message}
      </div>
    );
  }
  // --- End Loading/Error Handling ---

  // --- Check if any accounts are connected ---
  if (initialized && accounts.length === 0) {
    return (
      <div className="p-6 text-center border rounded-lg shadow-sm bg-background">
        <p className="mb-4 text-muted-foreground">
          Connect an account to post to Your Favourite Channel
        </p>
        <Button onClick={() => router.push("/settings/connections")}>
          Connect
        </Button>
      </div>
    );
  }
  // --- End empty state check ---

  // Don't render anything until initialization is complete
  if (!initialized) {
    // This handles the case where accounts are loaded but processing hasn't finished the first time
    return <div className="p-4 text-center">Initializing...</div>;
  }

  // Handle accordion expand/collapse
  const handleAccordionChange = (value) => {
    setExpandedPlatforms(value ? [value] : []);
  };

  // Toggle account selection
  const toggleAccountSelection = (platform, accountId) => {
    const idKey = accountId.toString();

    setSelectedAccounts((prev) => {
      // Create a new object to avoid state mutation
      const updated = JSON.parse(JSON.stringify(prev));
      // Toggle the selection state
      updated[platform][idKey] = !updated[platform][idKey];

      // --- Immediately notify parent of the change ---
      const selectedList = getSelectedListFromState(updated);
      if (onSelectionChange) {
        onSelectionChange(selectedList);
      }
      // --- End notification ---

      return updated;
    });
  };

  // Helper function to extract selected accounts from state
  const getSelectedListFromState = (state) => {
    const list = [];
    Object.keys(state).forEach((p) => {
      Object.keys(state[p]).forEach((id) => {
        if (state[p][id]) {
          // Use processedPlatformAccounts here
          const account = processedPlatformAccounts[p]?.find(
            (a) => a.id.toString() === id
          );
          if (account) {
            list.push({ ...account, platform: p });
          }
        }
      });
    });
    return list;
  };

  // Check if any account is selected for a platform
  const hasSelectedAccounts = (platform) => {
    if (!selectedAccounts[platform]) return false;
    return Object.values(selectedAccounts[platform]).some(
      (selected) => selected
    );
  };

  // Count selected accounts for a platform
  const countSelectedAccounts = (platform) => {
    if (!selectedAccounts[platform]) return 0;
    return Object.values(selectedAccounts[platform]).filter(
      (selected) => selected
    ).length;
  };

  // Get icon for platform (Updated to match Authenticate/page.jsx)
  const PlatformIcon = ({ platform }) => {
    const iconProps = { className: "h-5 w-5" };
    switch (platform) {
      case "instagram":
        return <Instagram {...iconProps} />;
      case "twitter":
        return <Twitter {...iconProps} />;
      case "facebook":
        return <Facebook {...iconProps} />;
      case "threads": // Match Authenticate page: custom div for Threads
        return (
          <div className="h-5 w-5 text-sm font-bold flex items-center justify-center">
            @
          </div>
        );
      case "ytShorts": // Match Authenticate page: key is ytShorts
        return <Youtube {...iconProps} />;
      case "tiktok":
        return <TikTokIcon {...iconProps} />;
      case "bluesky":
        return <BlueskyIcon {...iconProps} />;
      default:
        return null;
    }
  };

  // Platform display names (Updated to match Authenticate/page.jsx)
  const platformNames = {
    instagram: "Instagram",
    twitter: "Twitter",
    facebook: "Facebook",
    threads: "Threads",
    ytShorts: "YouTube Shorts", // Match Authenticate page: key is ytShorts
    tiktok: "TikTok",
    bluesky: "Bluesky",
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-lg font-semibold mb-4">Select Accounts</h2>

      <Accordion
        type="single"
        collapsible
        value={expandedPlatforms[0]}
        onValueChange={handleAccordionChange}
        className="w-full space-y-3"
      >
        {Object.entries(processedPlatformAccounts).map(
          ([platform, accounts]) => (
            <AccordionItem
              key={platform}
              value={platform}
              className="border rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="flex items-center gap-3 py-3 px-4 hover:no-underline bg-primary/5">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform={platform} />
                  <span className="font-medium">{platformNames[platform]}</span>
                </div>

                {hasSelectedAccounts(platform) && (
                  <div className="ml-auto mr-2 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                    {countSelectedAccounts(platform)} selected
                  </div>
                )}
              </AccordionTrigger>

              <AccordionContent className="bg-background">
                <div className="py-2 divide-y">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between py-3 px-4 hover:bg-muted/20"
                    >
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() =>
                          toggleAccountSelection(platform, account.id)
                        }
                      >
                        <Username
                          name={account.name}
                          email={account.email}
                          imageUrl={account.imageUrl}
                        />
                      </div>
                      <div>
                        <div
                          className={`ml-4 h-5 w-5 rounded border flex items-center justify-center cursor-pointer ${
                            selectedAccounts[platform]?.[account.id.toString()]
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-input"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAccountSelection(platform, account.id);
                          }}
                        >
                          {selectedAccounts[platform]?.[
                            account.id.toString()
                          ] && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3 w-3"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        )}
      </Accordion>
    </div>
  );
}
