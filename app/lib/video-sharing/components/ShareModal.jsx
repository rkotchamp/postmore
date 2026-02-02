"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { Badge } from "@/app/components/ui/badge";
import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { Calendar as CalendarComponent } from "@/app/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  ChevronRight,
  ChevronLeft,
  Share2,
  AlertCircle,
  CheckCircle2,
  X,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Linkedin,
  Clock,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { useShareStore } from "@/app/lib/store/shareStore";
import { useTemplateStore } from "@/app/lib/store/templateStore";
import { AccountSelector } from "./AccountSelector";
import { toast } from "sonner";

// Platform Icons (reused from AccountSelector)
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.321 5.562a5.124 5.124 0 0 1-5.16-4.956h-3.364v14.88c0 1.767-1.436 3.204-3.204 3.204a3.204 3.204 0 0 1-3.204-3.204 3.204 3.204 0 0 1 3.204-3.204c.282 0 .553.044.813.116v-3.364a6.552 6.552 0 0 0-.813-.052A6.568 6.568 0 0 0 1.025 15.55 6.568 6.568 0 0 0 7.593 22.12a6.568 6.568 0 0 0 6.568-6.568V9.658a8.464 8.464 0 0 0 5.16 1.752v-3.364a5.113 5.113 0 0 1-3.137-1.053 5.177 5.177 0 0 1-1.602-2.084V4.9" />
  </svg>
);

const BlueskyIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" />
    <path d="M17 12c0 2.8-2.2 5-5 5s-5-2.2-5-5 2.2-5 5-5 5 2.2 5 5Z" />
  </svg>
);

const PlatformIcon = ({ platform, className }) => {
  const iconProps = { className: className || "h-5 w-5" };
  const normalizedPlatform = platform?.toLowerCase();

  switch (normalizedPlatform) {
    case "instagram":
      return <Instagram {...iconProps} />;
    case "twitter":
    case "x":
      return <Twitter {...iconProps} />;
    case "facebook":
      return <Facebook {...iconProps} />;
    case "threads":
      return (
        <div
          className={`${
            className || "h-5 w-5"
          } text-sm font-bold flex items-center justify-center`}
        >
          @
        </div>
      );
    case "ytshorts":
    case "youtube":
      return <Youtube {...iconProps} />;
    case "tiktok":
      return <TikTokIcon {...iconProps} />;
    case "bluesky":
      return <BlueskyIcon {...iconProps} />;
    case "linkedin":
      return <Linkedin {...iconProps} />;
    default:
      return null;
  }
};

const PLATFORM_CONFIG = {
  instagram: { name: "Instagram", order: 1 },
  tiktok: { name: "TikTok", order: 2 },
  ytshorts: { name: "YouTube Shorts", order: 3 },
  youtube: { name: "YouTube", order: 4 },
  twitter: { name: "Twitter", order: 5 },
  facebook: { name: "Facebook", order: 6 },
  threads: { name: "Threads", order: 7 },
  linkedin: { name: "LinkedIn", order: 8 },
  bluesky: { name: "Bluesky", order: 9 },
};

export function ShareModal({ isOpen, onClose, clips = [], accounts = [], projectId }) {
  const {
    currentStep,
    selectedAccounts,
    selectedClips,
    captionMode,
    singleCaption,
    accountCaptions,
    clipCaptions,
    sharingMatrix,
    shareOptions,
    isSharing,
    shareProgress,
    setCurrentStep,
    setCaptionMode,
    setSingleCaption,
    setAccountCaption,
    setClipCaption,
    initializeSharingMatrix,
    togglePair,
    setSelectedClips,
    setScheduleType,
    setScheduledAt,
    resetShareState,
    isReadyToShare,
  } = useShareStore();

  const [localAccounts, setLocalAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sharingComplete, setSharingComplete] = useState(false);

  // Schedule state helpers
  const displayDate = useMemo(() => {
    if (!shareOptions.scheduledAt) return new Date();
    try {
      const date = new Date(shareOptions.scheduledAt);
      if (isNaN(date.getTime())) {
        return new Date();
      }
      return date;
    } catch (error) {
      return new Date();
    }
  }, [shareOptions.scheduledAt]);

  const displayTime = useMemo(() => {
    const date = displayDate;
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }, [displayDate]);

  // Time options (30-minute intervals)
  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const formattedHour = hour.toString().padStart(2, "0");
        const formattedMinute = minute.toString().padStart(2, "0");
        options.push(`${formattedHour}:${formattedMinute}`);
      }
    }
    return options;
  }, []);

  const createValidDateFromParts = (dateOnly, timeString) => {
    try {
      if (!(dateOnly instanceof Date) || isNaN(dateOnly.getTime())) {
        return null;
      }
      if (
        typeof timeString !== "string" ||
        !timeString.match(/^\d{2}:\d{2}$/)
      ) {
        return null;
      }
      const [hours, minutes] = timeString.split(":").map(Number);
      const newDate = new Date(
        dateOnly.getFullYear(),
        dateOnly.getMonth(),
        dateOnly.getDate(),
        hours,
        minutes,
        0,
        0
      );
      if (isNaN(newDate.getTime())) {
        return null;
      }
      return newDate;
    } catch (error) {
      return null;
    }
  };

  // Fetch authenticated accounts when modal opens
  useEffect(() => {
    if (isOpen && accounts.length === 0) {
      fetchAccounts();
    } else if (isOpen && accounts.length > 0) {
      setLocalAccounts(accounts);
      setLoadingAccounts(false);
    }
  }, [isOpen, accounts]);

  // Initialize clips when modal opens
  useEffect(() => {
    if (isOpen && clips.length > 0) {
      setSelectedClips(clips);
    }
  }, [isOpen, clips, setSelectedClips]);

  // Initialize sharing matrix when moving to review step
  useEffect(() => {
    if (
      currentStep === "review" &&
      selectedAccounts.length > 0 &&
      selectedClips.length > 0
    ) {
      initializeSharingMatrix();
    }
  }, [
    currentStep,
    selectedAccounts.length,
    selectedClips.length,
    initializeSharingMatrix,
  ]);

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await fetch("/api/accounts/authenticated");
      if (response.ok) {
        const data = await response.json();
        setLocalAccounts(data.accounts || []);
      } else {
        toast.error("Failed to load accounts");
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      toast.error("Failed to load accounts");
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleClose = () => {
    resetShareState();
    onClose();
  };

  const handleNext = () => {
    const steps = ["accounts", "captions", "schedule", "review"];
    const currentIndex = steps.indexOf(currentStep);

    if (currentIndex === 0 && selectedAccounts.length === 0) {
      toast.error("Please select at least one account");
      return;
    }

    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const steps = ["accounts", "captions", "schedule", "review"];
    const currentIndex = steps.indexOf(currentStep);

    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleScheduleTypeChange = (type) => {
    setScheduleType(type);
    if (type === "scheduled" && !shareOptions.scheduledAt) {
      // Set default scheduled time (30 minutes from now)
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 30);
      const minutes = futureDate.getMinutes();
      futureDate.setMinutes(minutes - (minutes % 30));
      setScheduledAt(futureDate);
    } else if (type === "immediate") {
      setScheduledAt(null);
    }
  };

  const handleDateChange = (newDate) => {
    if (!newDate) return;
    const combinedDateTime = createValidDateFromParts(newDate, displayTime);
    if (combinedDateTime) {
      setScheduledAt(combinedDateTime);
    }
  };

  const handleTimeChange = (newTime) => {
    const combinedDateTime = createValidDateFromParts(displayDate, newTime);
    if (combinedDateTime) {
      setScheduledAt(combinedDateTime);
    }
  };

  const handleShare = async () => {
    if (!isReadyToShare()) {
      toast.error("Please complete all required fields");
      return;
    }

    console.log("🚀 [SHARE_MODAL] ========== SHARING STARTED ==========");
    console.log("⏰ [SHARE_MODAL] Timestamp:", new Date().toISOString());

    try {
      // Trigger the sharing process
      const {
        startSharing,
        getEnabledPairs,
        getCaptionForPair,
      } = useShareStore.getState();

      const enabledPairs = getEnabledPairs();
      console.log("📊 [SHARE_MODAL] Enabled pairs:", enabledPairs.length);
      console.log(
        "📋 [SHARE_MODAL] Clips:",
        enabledPairs.map((p) => p.clip.title)
      );
      console.log(
        "🎯 [SHARE_MODAL] Accounts:",
        enabledPairs.map((p) => `${p.account.platform} (${p.account.username})`)
      );

      // Start sharing (don't close this modal, just change the view)
      startSharing();

      console.log("📤 [SHARE_MODAL] Starting share process...");

      // Fetch project transcription data FIRST (before creating sharingData)
      let projectTranscription = null;

      console.log('🔍 [SHARE_MODAL] Fetching project transcription for caption burning...');
      console.log('🔍 [SHARE_MODAL] ProjectId:', projectId);

      if (!projectId) {
        console.error('❌ [SHARE_MODAL] ProjectId is undefined or null!');
      } else {
        try {
          const projectUrl = `/api/clipper-studio/projects/${projectId}`;
          console.log('🔍 [SHARE_MODAL] Fetching from:', projectUrl);

          const projectResponse = await fetch(projectUrl);
          console.log('🔍 [SHARE_MODAL] Response status:', projectResponse.status);

          if (projectResponse.ok) {
            const response = await projectResponse.json();
            console.log('🔍 [SHARE_MODAL] Response data:', response);
            const projectData = response.project;

            console.log('🔍 [SHARE_MODAL] Project transcription data:', {
              hasTranscription: !!projectData.transcription,
              hasSegments: !!(projectData.transcription?.segments),
              segmentsLength: projectData.transcription?.segments?.length || 0
            });

            // Store transcription data for later use per clip
            if (projectData.transcription?.segments && projectData.transcription.segments.length > 0) {
              projectTranscription = projectData.transcription;
              console.log('✅ [SHARE_MODAL] Found project transcription with', projectTranscription.segments.length, 'segments');
            } else {
              console.log('⚠️ [SHARE_MODAL] Project has no transcription segments');
            }
          } else {
            console.log('⚠️ [SHARE_MODAL] Failed to fetch project data:', projectResponse.status);
          }
        } catch (error) {
          console.error('❌ [SHARE_MODAL] Error fetching project transcription:', error);
          console.error('❌ [SHARE_MODAL] Error details:', error.message, error.stack);
        }
      }

      // Get template and caption settings from templateStore
      const templateState = useTemplateStore.getState();
      const hasTemplateApplied = templateState.isTemplateApplied;

      let templateData = null;
      let captionSettings = null;

      if (hasTemplateApplied) {
        // Get the first selected clip to extract title/templateHeader
        // Note: In bulk sharing, all clips use the same template settings
        const firstClip = selectedClips[0];

        // Determine which text to use based on template type
        const isCustomTitleTemplate =
          templateState.appliedTemplate === "social-profile" ||
          templateState.appliedTemplate === "title-only";

        // For custom title templates, use templateHeader; otherwise use original title
        const displayText = isCustomTitleTemplate
          ? firstClip.templateHeader || firstClip.title || ""
          : firstClip.title || "";

        // Get plain text version (strip HTML tags)
        const getPlainText = (html) => {
          if (!html) return "";
          const div = document.createElement("div");
          div.innerHTML = html;
          return div.textContent || div.innerText || "";
        };

        const plainText = getPlainText(displayText);

        // Template is applied, include template data with ALL required fields
        templateData = {
          template: templateState.appliedTemplate,
          title: displayText, // HTML with colors
          plainTitle: plainText, // Plain text version
          templateHeader: displayText, // For template header rendering
          settings: templateState.appliedSettings,
          aspectRatio: "vertical", // Default to vertical for share
        };

        // Include caption style settings
        captionSettings = {
          font: templateState.captionFont,
          size: templateState.captionSize,
          position: templateState.captionPosition,
          weight: templateState.captionWeight,
        };

        console.log("🎨 [SHARE_MODAL] Template applied:", {
          template: templateState.appliedTemplate,
          title: plainText,
          hasTemplateHeader: !!templateData.templateHeader,
          font: captionSettings.font,
          size: captionSettings.size,
          position: captionSettings.position,
          weight: captionSettings.weight,
        });
      } else {
        console.log("📝 [SHARE_MODAL] No template applied - using raw video");
      }

      // NOW prepare sharing data with caption burning support (after fetching transcription)
      const sharingData = enabledPairs.map(
        ({ clip, account, clipId, accountId }) => {
          // Prepare caption data for this clip
          let clipCaptionData = null;

          if (projectTranscription && projectTranscription.segments) {
            console.log('🔥 [SHARE_MODAL] Filtering transcription segments for clip:', clip.title);

            const clipStart = clip.startTime;
            const clipEnd = clip.endTime;

            const clipSegments = projectTranscription.segments
              .filter(segment => {
                // Include segment if it overlaps with clip time range
                return segment.start < clipEnd && segment.end > clipStart;
              })
              .map(segment => {
                // Adjust segment timing relative to clip start (0-based)
                return {
                  startTime: Math.max(0, segment.start - clipStart),
                  endTime: Math.min(clip.duration, segment.end - clipStart),
                  text: segment.text
                };
              });

            if (clipSegments.length > 0) {
              clipCaptionData = {
                captions: clipSegments,
                totalDuration: clip.duration || 30,
                platform: 'tiktok'
              };

              console.log('✅ [SHARE_MODAL] Caption data prepared for clip:', {
                clipTitle: clip.title,
                segmentCount: clipCaptionData.captions.length,
                totalDuration: clipCaptionData.totalDuration,
                firstSegment: clipCaptionData.captions[0]
              });
            } else {
              console.log('⚠️ [SHARE_MODAL] No segments found within clip time range for:', clip.title);
            }
          }

          return {
            clipId,
            accountId,
            clip,
            account,
            caption: getCaptionForPair(clipId, accountId),
            captionData: clipCaptionData, // Add caption data for burning
          };
        }
      );

      // Call sharing API
      console.log("🌐 [SHARE_MODAL] Calling share API...");
      console.log("📦 [SHARE_MODAL] Payload:", {
        sharesCount: sharingData.length,
        scheduleType: shareOptions.scheduleType,
        hasTemplate: !!templateData,
        hasCaptionSettings: !!captionSettings,
      });

      const startTime = Date.now();
      const response = await fetch("/api/clipper-studio/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shares: sharingData,
          scheduleTime:
            shareOptions.scheduleType === "scheduled"
              ? shareOptions.scheduledAt
              : null,
          templateData,
          captionSettings,
        }),
      });

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      console.log(`⏱️ [SHARE_MODAL] API call took ${duration} seconds`);

      const result = await response.json();
      console.log("📥 [SHARE_MODAL] API Response:", {
        status: response.status,
        ok: response.ok,
        success: result.success,
        successCount: result.successCount,
        failedCount: result.failedCount,
        isScheduled: result.isScheduled,
      });

      if (!response.ok) {
        const errorMsg = result.message || result.error || "Sharing failed";
        console.error("❌ [SHARE_MODAL] Share API error:", result);
        throw new Error(errorMsg);
      }

      if (result.success) {
        console.log("✅ [SHARE_MODAL] Sharing completed successfully!");
        console.log("📊 [SHARE_MODAL] Results:", result.results);

        // Stop the progress modal spinner and show success
        const { completeSharing } = useShareStore.getState();
        completeSharing();
        setSharingComplete(true);
        console.log(
          "🛑 [SHARE_MODAL] Called completeSharing() and set sharingComplete=true"
        );

        const successMessage = result.isScheduled
          ? `Successfully scheduled ${result.successCount} posts`
          : `Successfully shared to ${result.successCount} accounts`;

        toast.success(successMessage);

        if (result.failedCount > 0) {
          console.warn(`⚠️ [SHARE_MODAL] ${result.failedCount} shares failed`);
          toast.warning(`${result.failedCount} shares failed`);
        }

        console.log("🏁 [SHARE_MODAL] ========== SHARING COMPLETED ==========");
      } else {
        throw new Error(result.error || "Sharing failed");
      }
    } catch (error) {
      console.error("❌ [SHARE_MODAL] Sharing error:", error);
      console.error("🔍 [SHARE_MODAL] Error stack:", error.stack);

      // Also stop spinner on error
      const { completeSharing } = useShareStore.getState();
      completeSharing();

      toast.error(error.message || "Failed to share clips");
    }
  };

  const getStepNumber = () => {
    const steps = ["accounts", "captions", "schedule", "review"];
    return steps.indexOf(currentStep) + 1;
  };

  const canProceed = () => {
    if (currentStep === "accounts") {
      return selectedAccounts.length > 0;
    }
    if (currentStep === "captions") {
      // Captions are optional, so always allow proceed
      return true;
    }
    if (currentStep === "schedule") {
      // If scheduled, must have a valid date
      if (shareOptions.scheduleType === "scheduled") {
        return shareOptions.scheduledAt !== null;
      }
      return true;
    }
    return true;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Share Clips to Social Media
            </DialogTitle>
          </DialogHeader>

          {/* Progress Bar - Hide when showing progress/success view */}
          {!isSharing && !sharingComplete && (
          <div className="flex items-center gap-2 mb-4">
            <div
              className={`flex-1 h-2 rounded-full ${
                currentStep === "accounts" ||
                currentStep === "captions" ||
                currentStep === "schedule" ||
                currentStep === "review"
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
            <div
              className={`flex-1 h-2 rounded-full ${
                currentStep === "captions" ||
                currentStep === "schedule" ||
                currentStep === "review"
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
            <div
              className={`flex-1 h-2 rounded-full ${
                currentStep === "schedule" || currentStep === "review"
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
            <div
              className={`flex-1 h-2 rounded-full ${
                currentStep === "review" ? "bg-primary" : "bg-muted"
              }`}
            />
          </div>
          )}

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Progress/Success View - Show when sharing is in progress or complete */}
            {(() => {
              const showProgress = isSharing || sharingComplete;
              console.log('🔍 [SHARE_MODAL] Render check:', {
                isSharing,
                sharingComplete,
                showProgress,
                currentStep
              });
              return showProgress;
            })() ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 min-h-[400px]">
                {/* Loading/Success Icon */}
                <div className="relative w-32 h-32 mb-8">
                  {/* Share Icon in Center */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`rounded-full p-6 ${isSharing ? 'bg-primary/10' : 'bg-green-500/10'}`}>
                      <Share2 className={`w-12 h-12 ${isSharing ? 'text-primary' : 'text-green-500'}`} />
                    </div>
                  </div>

                  {/* Orbiting Spinner - Only show while sharing */}
                  {isSharing && (
                    <div className="absolute inset-0 animate-spin">
                      <div className="relative w-full h-full">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dynamic Message */}
                <div className="text-center space-y-3 max-w-sm">
                  {sharingComplete ? (
                    <button
                      onClick={() => {
                        console.log('🔒 [SHARE_MODAL] Done button clicked - closing and resetting...');
                        setSharingComplete(false);
                        resetShareState();
                        onClose();
                      }}
                      className="text-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-all px-8 py-3 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto"
                    >
                      <Share2 className="w-5 h-5" />
                      Done
                    </button>
                  ) : (
                    <p className="text-lg font-semibold text-foreground">
                      {shareProgress.total > 0 && shareProgress.completed < shareProgress.total
                        ? `Processing ${shareProgress.completed + 1} of ${shareProgress.total}...`
                        : "Preparing your content..."}
                    </p>
                  )}

                  {/* Subtle progress indicator */}
                  {isSharing && shareProgress.total > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {shareProgress.completed} of {shareProgress.total} {shareProgress.completed === 1 ? 'post' : 'posts'} processed
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
            {/* Step 1: Select Accounts */}
            {currentStep === "accounts" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Select Accounts</h3>
                  <Badge variant="secondary">
                    {selectedClips.length} clip
                    {selectedClips.length !== 1 ? "s" : ""} to share
                  </Badge>
                </div>
                {loadingAccounts ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading accounts...</p>
                  </div>
                ) : (
                  <AccountSelector
                    accounts={localAccounts}
                    clips={selectedClips}
                  />
                )}
              </div>
            )}

            {/* Step 2: Add Captions */}
            {currentStep === "captions" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Add Captions</h3>
                </div>

                {/* Caption Mode Selection */}
                <RadioGroup value={captionMode} onValueChange={setCaptionMode}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single" className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">Single caption for all</p>
                        <p className="text-sm text-muted-foreground">
                          Use the same caption for all clips and accounts
                        </p>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="per-account" id="per-account" />
                    <Label
                      htmlFor="per-account"
                      className="flex-1 cursor-pointer"
                    >
                      <div>
                        <p className="font-medium">Caption per account</p>
                        <p className="text-sm text-muted-foreground">
                          Customize caption for each account
                        </p>
                      </div>
                    </Label>
                  </div>

                  {selectedClips.length > 1 && (
                    <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="per-clip" id="per-clip" />
                      <Label
                        htmlFor="per-clip"
                        className="flex-1 cursor-pointer"
                      >
                        <div>
                          <p className="font-medium">Caption per clip</p>
                          <p className="text-sm text-muted-foreground">
                            Customize caption for each clip
                          </p>
                        </div>
                      </Label>
                    </div>
                  )}
                </RadioGroup>

                {/* Caption Input */}
                <div className="space-y-4">
                  {captionMode === "single" && (
                    <div>
                      <Label htmlFor="single-caption">Caption</Label>
                      <Textarea
                        id="single-caption"
                        placeholder="Write your caption here..."
                        value={singleCaption}
                        onChange={(e) => setSingleCaption(e.target.value)}
                        rows={6}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {singleCaption.length} characters
                      </p>
                    </div>
                  )}

                  {captionMode === "per-clip" && (
                    <div className="space-y-4">
                      {selectedClips.map((clip, index) => (
                        <div key={clip.id} className="border rounded-lg p-4">
                          <Label
                            htmlFor={`clip-caption-${clip.id}`}
                            className="flex items-center gap-2 mb-2"
                          >
                            <span className="font-medium">
                              Clip {index + 1}:
                            </span>
                            <span className="text-sm text-muted-foreground truncate">
                              {clip.title}
                            </span>
                          </Label>
                          <Textarea
                            id={`clip-caption-${clip.id}`}
                            placeholder="Write caption for this clip..."
                            value={clipCaptions[clip.id] || ""}
                            onChange={(e) =>
                              setClipCaption(clip.id, e.target.value)
                            }
                            rows={4}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {(clipCaptions[clip.id] || "").length} characters
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {captionMode === "per-account" && (
                    <div className="space-y-4">
                      <Accordion type="multiple" className="w-full space-y-2">
                        {(() => {
                          // Group accounts by platform
                          const groupedAccounts = selectedAccounts.reduce(
                            (acc, account) => {
                              const platform = (
                                account.platform || "other"
                              ).toLowerCase();
                              if (!acc[platform]) {
                                acc[platform] = [];
                              }
                              acc[platform].push(account);
                              return acc;
                            },
                            {}
                          );

                          // Sort platforms
                          const sortedPlatforms = Object.keys(
                            groupedAccounts
                          ).sort((a, b) => {
                            const orderA = PLATFORM_CONFIG[a]?.order || 99;
                            const orderB = PLATFORM_CONFIG[b]?.order || 99;
                            return orderA - orderB;
                          });

                          return sortedPlatforms.map((platform) => {
                            const platformAccounts = groupedAccounts[platform];
                            const platformName =
                              PLATFORM_CONFIG[platform]?.name || platform;

                            return (
                              <AccordionItem
                                key={platform}
                                value={platform}
                                className="border rounded-lg px-4 bg-background"
                              >
                                <AccordionTrigger className="hover:no-underline py-4">
                                  <div className="flex items-center gap-3">
                                    <PlatformIcon
                                      platform={platform}
                                      className="h-5 w-5 text-foreground"
                                    />
                                    <span className="font-medium text-foreground">
                                      {platformName}
                                    </span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="pb-3 pt-1">
                                  <div className="space-y-4">
                                    {platformAccounts.map((account) => {
                                      const avatarSrc =
                                        account.profileImage ||
                                        account.avatar ||
                                        account.imageUrl;
                                      const name =
                                        account.displayName ||
                                        account.name ||
                                        account.username ||
                                        "User";
                                      const username =
                                        account.username ||
                                        account.platformUsername ||
                                        account.email;

                                      return (
                                        <div
                                          key={account.id}
                                          className="flex items-start gap-3"
                                        >
                                          {/* Avatar on the left */}
                                          <Avatar className="h-10 w-10 flex-shrink-0 mt-1">
                                            <AvatarImage
                                              src={avatarSrc}
                                              alt={name}
                                            />
                                            <AvatarFallback className="text-sm bg-primary/10 text-primary">
                                              {name.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>

                                          {/* Caption input on the right */}
                                          <div className="flex-1 space-y-2">
                                            <div>
                                              <p className="font-medium text-sm">
                                                {name}
                                              </p>
                                              {username && (
                                                <p className="text-xs text-muted-foreground">
                                                  {username}
                                                </p>
                                              )}
                                            </div>
                                            <Textarea
                                              id={`account-caption-${account.id}`}
                                              placeholder={`Write caption for ${name}...`}
                                              value={
                                                accountCaptions[account.id] ||
                                                ""
                                              }
                                              onChange={(e) =>
                                                setAccountCaption(
                                                  account.id,
                                                  e.target.value
                                                )
                                              }
                                              rows={3}
                                              className="resize-none"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                              {
                                                (
                                                  accountCaptions[account.id] ||
                                                  ""
                                                ).length
                                              }{" "}
                                              characters
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          });
                        })()}
                      </Accordion>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Schedule Posts */}
            {currentStep === "schedule" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Choose when to share
                  </h3>
                </div>

                {/* Schedule Type Selection */}
                <RadioGroup
                  value={shareOptions.scheduleType}
                  onValueChange={handleScheduleTypeChange}
                >
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="immediate" id="immediate" />
                    <Label
                      htmlFor="immediate"
                      className="flex-1 cursor-pointer"
                    >
                      <div>
                        <p className="font-medium">Post immediately</p>
                        <p className="text-sm text-muted-foreground">
                          Share your clips right away
                        </p>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="scheduled" id="scheduled" />
                    <Label
                      htmlFor="scheduled"
                      className="flex-1 cursor-pointer"
                    >
                      <div>
                        <p className="font-medium">Schedule post</p>
                        <p className="text-sm text-muted-foreground">
                          Choose a specific date and time
                        </p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                {/* Date and Time Picker for Scheduled Posts */}
                {shareOptions.scheduleType === "scheduled" && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">Select Date & Time</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Date Picker */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="schedule-date"
                          className="text-sm font-medium"
                        >
                          Date
                        </Label>
                        <Popover
                          open={showDatePicker}
                          onOpenChange={setShowDatePicker}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              onClick={() => setShowDatePicker(true)}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {displayDate ? (
                                format(displayDate, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={displayDate}
                              onSelect={handleDateChange}
                              initialFocus
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Time Picker */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="schedule-time"
                          className="text-sm font-medium"
                        >
                          Time
                        </Label>
                        <Select
                          value={displayTime}
                          onValueChange={handleTimeChange}
                        >
                          <SelectTrigger className="w-full">
                            <Clock className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="max-h-[200px] overflow-y-auto">
                              {timeOptions.map((timeOption) => (
                                <SelectItem key={timeOption} value={timeOption}>
                                  {timeOption}
                                </SelectItem>
                              ))}
                            </div>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Scheduled Time Preview */}
                    {shareOptions.scheduledAt && (
                      <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">
                          Scheduled for:
                        </p>
                        <p className="text-base font-medium text-foreground">
                          {format(displayDate, "EEEE, MMMM d, yyyy")} at{" "}
                          {displayTime}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Review & Share */}
            {currentStep === "review" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Review Your Shares
                  </h3>
                </div>

                {/* Sharing Matrix */}
                {selectedClips.length > 1 && selectedAccounts.length > 1 && (
                  <div>
                    <h4 className="font-medium mb-3">Sharing Matrix</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-3 text-left font-medium">
                                Clip
                              </th>
                              {selectedAccounts.map((account) => (
                                <th
                                  key={account.id}
                                  className="p-3 text-center font-medium"
                                >
                                  {account.platform}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {selectedClips.map((clip, clipIndex) => (
                              <tr
                                key={clip.id}
                                className={
                                  clipIndex % 2 === 0 ? "bg-muted/30" : ""
                                }
                              >
                                <td className="p-3 font-medium truncate max-w-[200px]">
                                  {clip.title}
                                </td>
                                {selectedAccounts.map((account) => {
                                  const pairKey = `${clip.id}-${account.id}`;
                                  const isEnabled = sharingMatrix[pairKey];
                                  return (
                                    <td
                                      key={account.id}
                                      className="p-3 text-center"
                                    >
                                      <Checkbox
                                        checked={isEnabled}
                                        onCheckedChange={() =>
                                          togglePair(clip.id, account.id)
                                        }
                                        className="mx-auto"
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Uncheck any clip-account pairs you don't want to share
                    </p>
                  </div>
                )}

                {/* Accounts with Captions */}
                <div>
                  <h4 className="font-medium mb-3">Accounts & Captions</h4>
                  <Accordion type="multiple" className="w-full space-y-2">
                    {(() => {
                      // Group accounts by platform
                      const groupedAccounts = selectedAccounts.reduce(
                        (acc, account) => {
                          const platform = (
                            account.platform || "other"
                          ).toLowerCase();
                          if (!acc[platform]) {
                            acc[platform] = [];
                          }
                          acc[platform].push(account);
                          return acc;
                        },
                        {}
                      );

                      // Sort platforms
                      const sortedPlatforms = Object.keys(groupedAccounts).sort(
                        (a, b) => {
                          const orderA = PLATFORM_CONFIG[a]?.order || 99;
                          const orderB = PLATFORM_CONFIG[b]?.order || 99;
                          return orderA - orderB;
                        }
                      );

                      // Get caption helper
                      const { getCaptionForPair } = useShareStore.getState();

                      return sortedPlatforms.map((platform) => {
                        const platformAccounts = groupedAccounts[platform];
                        const platformName =
                          PLATFORM_CONFIG[platform]?.name || platform;

                        return (
                          <AccordionItem
                            key={platform}
                            value={platform}
                            className="border rounded-lg px-4 bg-background"
                          >
                            <AccordionTrigger className="hover:no-underline py-4">
                              <div className="flex items-center gap-3">
                                <PlatformIcon
                                  platform={platform}
                                  className="h-5 w-5 text-foreground"
                                />
                                <span className="font-medium text-foreground">
                                  {platformName}
                                </span>
                                <Badge variant="secondary" className="ml-auto">
                                  {platformAccounts.length} account
                                  {platformAccounts.length !== 1 ? "s" : ""}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-3 pt-1">
                              <div className="space-y-3">
                                {platformAccounts.map((account) => {
                                  const avatarSrc =
                                    account.profileImage ||
                                    account.avatar ||
                                    account.imageUrl;
                                  const name =
                                    account.displayName ||
                                    account.name ||
                                    account.username ||
                                    "User";
                                  const username =
                                    account.username ||
                                    account.platformUsername ||
                                    account.email;

                                  // Get caption for this account (works for all caption modes)
                                  const caption = getCaptionForPair(
                                    selectedClips[0]?.id,
                                    account.id
                                  );

                                  return (
                                    <div
                                      key={account.id}
                                      className="flex items-start gap-3 p-3 border rounded-lg bg-muted/20"
                                    >
                                      {/* Avatar on the left */}
                                      <Avatar className="h-10 w-10 flex-shrink-0">
                                        <AvatarImage
                                          src={avatarSrc}
                                          alt={name}
                                        />
                                        <AvatarFallback className="text-sm bg-primary/10 text-primary">
                                          {name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>

                                      {/* Account info and caption on the right */}
                                      <div className="flex-1 min-w-0">
                                        <div className="mb-2">
                                          <p className="font-medium text-sm">
                                            {name}
                                          </p>
                                          {username && (
                                            <p className="text-xs text-muted-foreground">
                                              {username}
                                            </p>
                                          )}
                                        </div>

                                        {/* Caption display */}
                                        {caption ? (
                                          <div className="p-2 bg-background border rounded text-sm">
                                            <p className="whitespace-pre-wrap text-foreground">
                                              {caption}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {caption.length} characters
                                            </p>
                                          </div>
                                        ) : (
                                          <div className="p-2 bg-background border rounded text-sm">
                                            <p className="text-muted-foreground italic">
                                              No caption
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      });
                    })()}
                  </Accordion>
                </div>

                {/* Schedule Info */}
                {shareOptions.scheduleType === "scheduled" &&
                  shareOptions.scheduledAt && (
                    <div className="p-4 border rounded-lg bg-primary/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-5 w-5 text-primary" />
                        <h4 className="font-medium text-primary">
                          Scheduled Post
                        </h4>
                      </div>
                      <p className="text-sm text-foreground">
                        Your clips will be shared on{" "}
                        {format(
                          new Date(shareOptions.scheduledAt),
                          "EEEE, MMMM d, yyyy"
                        )}{" "}
                        at {format(new Date(shareOptions.scheduledAt), "HH:mm")}
                      </p>
                    </div>
                  )}
              </div>
            )}
            </>
            )}
          </div>

          {/* Hide footer when showing progress/success */}
          {!isSharing && !sharingComplete && (
          <DialogFooter className="flex justify-between mt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === "accounts"}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep !== "review" ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleShare} disabled={!isReadyToShare()}>
                <Share2 className="w-4 h-4 mr-2" />
                Share Now
              </Button>
            )}
          </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
