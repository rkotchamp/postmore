"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/app/components/ui/dialog";

const PLATFORM_NAMES = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter / X",
  bluesky: "Bluesky",
  ytShorts: "YouTube Shorts",
  linkedin: "LinkedIn",
  threads: "Threads",
};

export function PostResultsModal({ isOpen, results = [], selectedAccounts = [], onTryAgain }) {
  if (!results.length) return null;

  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const allFailed = succeeded.length === 0;

  // Look up display name + image from selectedAccounts by accountId
  const getAccount = (accountId) =>
    selectedAccounts.find((a) => a.id === accountId);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        // Prevent closing by clicking outside — user must explicitly act
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-3">
            {allFailed ? (
              <div className="rounded-full bg-red-100 p-3">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            ) : (
              <div className="rounded-full bg-yellow-100 p-3">
                <XCircle className="h-6 w-6 text-yellow-600" />
              </div>
            )}
          </div>
          <DialogTitle className="text-lg">
            {allFailed ? "Post Failed" : "Post Partially Failed"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {allFailed
              ? "Your post could not be published."
              : `Published to ${succeeded.length} platform${succeeded.length > 1 ? "s" : ""}, failed on ${failed.length}.`}
          </DialogDescription>
        </DialogHeader>

        {/* Results list */}
        <div className="mt-2 space-y-2">
          {results.map((result, i) => {
            const account = getAccount(result.accountId);
            const platformName =
              PLATFORM_NAMES[result.platform] || result.platform;
            const displayName = account?.name || platformName;

            return (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  result.success
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                {/* Status icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {result.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>

                {/* Account info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {account?.imageUrl && (
                      <img
                        src={account.imageUrl}
                        alt={displayName}
                        className="h-5 w-5 rounded-full object-cover flex-shrink-0"
                      />
                    )}
                    <span className="text-sm font-medium truncate">
                      {displayName}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {platformName}
                    </span>
                  </div>
                  {!result.success && result.error && (
                    <p className="mt-1 text-xs text-red-600 leading-snug">
                      {result.error}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-4">
          <Button className="w-full" onClick={onTryAgain}>
            Try Again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
