"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";
import { Instagram, Twitter, Facebook, Youtube, X } from "lucide-react";
import { Username } from "./components/Username";
import { Button } from "@/app/components/ui/button";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/app/components/ui/avatar";
import { DashboardLayout } from "@/app/dashboard/components/dashboard-layout";

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
};

export default function Authenticate() {
  const [connectedAccounts, setConnectedAccounts] = useState(initialAccounts);

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

  const connectionHandlers = {
    instagram: handleInstagramConnection,
    twitter: handleTwitterConnection,
    facebook: handleFacebookConnection,
    threads: handleThreadsConnection,
    ytShorts: handleYtShortsConnection,
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
      default:
        return null;
    }
  };

  const platformNames = {
    instagram: "Instagram",
    twitter: "Twitter",
    facebook: "Facebook",
    threads: "Threads",
    ytShorts: "YouTube Shorts",
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
                    >
                      <PlatformIcon platform={platform} />
                      Connect to {platformNames[platform]}
                    </Button>
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
