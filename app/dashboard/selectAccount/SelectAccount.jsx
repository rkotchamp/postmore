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
import { Instagram, Twitter, Facebook, AtSign, Youtube } from "lucide-react";

// Sample data - in a real app this would come from your API or props
const platformAccounts = {
  instagram: [
    {
      id: 1,
      name: "Marketing Team",
      email: "marketing@example.com",
      imageUrl: "/avatars/marketing.jpg",
    },
    {
      id: 2,
      name: "Fashion Brand",
      email: "fashion@example.com",
      imageUrl: "/avatars/fashion.jpg",
    },
  ],
  twitter: [
    {
      id: 3,
      name: "Company News",
      email: "news@example.com",
      imageUrl: "/avatars/news.jpg",
    },
    {
      id: 4,
      name: "Support Team",
      email: "support@example.com",
      imageUrl: "/avatars/support.jpg",
    },
  ],
  facebook: [
    {
      id: 5,
      name: "Community Page",
      email: "community@example.com",
      imageUrl: "/avatars/community.jpg",
    },
    {
      id: 6,
      name: "Product Page",
      email: "product@example.com",
      imageUrl: "/avatars/product.jpg",
    },
  ],
  threads: [
    {
      id: 7,
      name: "Creators Account",
      email: "creators@example.com",
      imageUrl: "/avatars/creators.jpg",
    },
  ],
  youtube: [
    {
      id: 8,
      name: "Tutorial Channel",
      email: "tutorials@example.com",
      imageUrl: "/avatars/tutorials.jpg",
    },
  ],
};

export function SelectAccount({ onSelectionChange }) {
  // Track initialization separately from rendering
  const [initialized, setInitialized] = useState(false);
  const [expandedPlatforms, setExpandedPlatforms] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState({});

  // One-time initialization
  useEffect(() => {
    if (initialized) return;

    // Create initial selection object
    const initialSelection = {};
    Object.keys(platformAccounts).forEach((platform) => {
      initialSelection[platform] = {};
      platformAccounts[platform].forEach((account) => {
        initialSelection[platform][account.id.toString()] = false;
      });
    });

    // Set state without triggering other effects
    setSelectedAccounts(initialSelection);
    // Mark initialization complete
    setInitialized(true);
  }, [initialized]);

  // Don't render anything until initialization is complete
  if (!initialized) {
    return <div className="p-4 text-center">Loading accounts...</div>;
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
      return updated;
    });
  };

  // Helper function to extract selected accounts from state
  const getSelectedListFromState = (state) => {
    const list = [];
    Object.keys(state).forEach((p) => {
      Object.keys(state[p]).forEach((id) => {
        if (state[p][id]) {
          const account = platformAccounts[p].find(
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

  // Get icon for platform
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
        return <AtSign {...iconProps} />;
      case "youtube":
        return <Youtube {...iconProps} />;
      default:
        return null;
    }
  };

  // Platform display names
  const platformNames = {
    instagram: "Instagram",
    twitter: "Twitter",
    facebook: "Facebook",
    threads: "Threads",
    youtube: "YouTube",
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
        {Object.entries(platformAccounts).map(([platform, accounts]) => (
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
        ))}
      </Accordion>

      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            // Reset all selections
            const reset = {};
            Object.keys(selectedAccounts).forEach((p) => {
              reset[p] = {};
              Object.keys(selectedAccounts[p]).forEach((id) => {
                reset[p][id] = false;
              });
            });

            // Update state
            setSelectedAccounts(reset);

            // Notify parent with empty selection directly
            if (onSelectionChange) {
              onSelectionChange([]);
            }
          }}
        >
          Clear All
        </Button>

        <Button
          variant="default"
          onClick={() => {
            // Get all selected accounts
            const selectedList = getSelectedListFromState(selectedAccounts);

            // Notify parent directly with selected accounts
            if (onSelectionChange) {
              onSelectionChange(selectedList);
            }
          }}
        >
          Confirm Selection
        </Button>
      </div>
    </div>
  );
}
