"use client";

import React from "react";
import { usePostStore } from "@/app/lib/store/postStore";
import { Switch } from "@/app/components/ui/switch";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Label } from "@/app/components/ui/label";
import { Separator } from "@/app/components/ui/separator";

const PRIVACY_OPTIONS = [
  { value: "PUBLIC_TO_EVERYONE", label: "Everyone" },
  { value: "MUTUAL_FOLLOW_FRIENDS", label: "Friends" },
  { value: "SELF_ONLY", label: "Only me" },
];

export function TikTokSettings() {
  const tiktokSettings = usePostStore((state) => state.tiktokSettings);
  const setTiktokSettings = usePostStore((state) => state.setTiktokSettings);
  const selectedAccounts = usePostStore((state) => state.selectedAccounts);

  const tiktokAccounts = selectedAccounts.filter(
    (acc) => acc.platform === "tiktok"
  );

  if (tiktokAccounts.length === 0) return null;

  const {
    privacyLevel,
    disableComment,
    disableDuet,
    disableStitch,
    isBrandOrganic,
    isBrandedContent,
    musicConfirmed,
  } = tiktokSettings;

  return (
    <div className="mt-4 border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/10 border-b">
        <svg
          className="h-4 w-4 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 12a4 4 0 1 0 4 4V4c.23 2.58 1.32 4.19 4 5v3c-1.5-.711-2.717-.216-4 1v3" />
        </svg>
        <span className="text-sm font-medium">TikTok Settings</span>
        <div className="ml-auto flex -space-x-1">
          {tiktokAccounts.map((acc) => (
            <span
              key={acc.id}
              className="text-xs text-muted-foreground"
              title={acc.name}
            >
              @{acc.name}
            </span>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Privacy Level */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Who can view this post <span className="text-destructive">*</span>
          </Label>
          <Select
            value={privacyLevel}
            onValueChange={(val) => setTiktokSettings({ privacyLevel: val })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose privacy setting" />
            </SelectTrigger>
            <SelectContent>
              {PRIVACY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!privacyLevel && (
            <p className="text-xs text-muted-foreground">
              Required — TikTok requires you to set a privacy level.
            </p>
          )}
        </div>

        <Separator />

        {/* Interaction Controls */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Allow interactions</p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="tiktok-comments"
                className="text-sm font-normal cursor-pointer"
              >
                Comments
              </Label>
              <Switch
                id="tiktok-comments"
                checked={!disableComment}
                onCheckedChange={(checked) =>
                  setTiktokSettings({ disableComment: !checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label
                htmlFor="tiktok-duets"
                className="text-sm font-normal cursor-pointer"
              >
                Duets
              </Label>
              <Switch
                id="tiktok-duets"
                checked={!disableDuet}
                onCheckedChange={(checked) =>
                  setTiktokSettings({ disableDuet: !checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label
                htmlFor="tiktok-stitches"
                className="text-sm font-normal cursor-pointer"
              >
                Stitches
              </Label>
              <Switch
                id="tiktok-stitches"
                checked={!disableStitch}
                onCheckedChange={(checked) =>
                  setTiktokSettings({ disableStitch: !checked })
                }
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Commercial Content Disclosure */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Commercial content</p>
          <p className="text-xs text-muted-foreground -mt-1">
            Disclose if this post promotes a brand or product.
          </p>
          <div className="space-y-2.5">
            <div className="flex items-start gap-3">
              <Switch
                id="tiktok-brand-organic"
                checked={isBrandOrganic}
                onCheckedChange={(checked) =>
                  setTiktokSettings({ isBrandOrganic: checked })
                }
              />
              <Label
                htmlFor="tiktok-brand-organic"
                className="text-sm font-normal leading-snug cursor-pointer"
              >
                Promote your own brand or product
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Switch
                id="tiktok-brand-content"
                checked={isBrandedContent}
                onCheckedChange={(checked) =>
                  setTiktokSettings({ isBrandedContent: checked })
                }
              />
              <div>
                <Label
                  htmlFor="tiktok-brand-content"
                  className="text-sm font-normal leading-snug cursor-pointer"
                >
                  Promote a third-party brand
                </Label>
                {isBrandedContent && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    TikTok will label this as branded content.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Music Usage Confirmation */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="tiktok-music"
            checked={musicConfirmed}
            onCheckedChange={(checked) =>
              setTiktokSettings({ musicConfirmed: !!checked })
            }
          />
          <Label
            htmlFor="tiktok-music"
            className="text-sm font-normal leading-snug cursor-pointer"
          >
            I confirm this content complies with{" "}
            <span className="font-medium">
              TikTok&apos;s Music Usage Confirmation
            </span>{" "}
            policy.{" "}
            <span className="text-destructive text-xs">*</span>
          </Label>
        </div>
        {!musicConfirmed && (
          <p className="text-xs text-muted-foreground -mt-3">
            Required to publish to TikTok.
          </p>
        )}
      </div>
    </div>
  );
}
