"use client";

import { useState, useEffect, useCallback, useContext } from "react";
import { Card, CardContent } from "@/app/components/ui/card";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  SendHorizontal,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Content } from "@/app/dashboard/content/Content";
import { SelectAccount } from "@/app/dashboard/selectAccount/SelectAccount";
import { Caption } from "@/app/dashboard/caption/Caption";
import { Preview } from "@/app/dashboard/preview/Preview";
import { TextPreview } from "@/app/dashboard/preview/TextPreview";
import { useMediaMutations } from "@/app/hooks/useMediaMutations";
import { useMediaItems } from "@/app/hooks/useMediaQueries";
import { useProgressCount } from "@/app/context/ProgressCountContext";
import { usePostData } from "@/app/context/PostDataContext";
import { useMediaTextFlow } from "@/app/context/MediaTextFlowContext";

// Steps for post creation process
const steps = [
  { id: "content", name: "Content" },
  { id: "accounts", name: "Accounts" },
  { id: "caption", name: "Caption" },
];

export function DashboardContent() {
  // --- Context Hooks ---
  const { progressCount, setProgressCount } = useProgressCount();
  const {
    postData,
    setPostData,
    addSelectedAccount,
    removeSelectedAccount,
    setSchedule,
    resetPostData,
  } = usePostData();
  const { behavior, setBehavior } = useMediaTextFlow();
  const { currentStep } = progressCount;
  const {
    selectedAccounts,
    scheduleType,
    scheduledAt,
    captionMode,
    singleCaption,
    multiCaptions,
  } = postData;
  const {
    postType: temporaryContentType,
    temporaryText,
    isMediaAvailable: sessionHasMedia,
    showPreviews,
  } = behavior;
  // ---------------------

  // --- TanStack Query State ---
  const { data: sessionMediaItems = [], isLoading: isLoadingMedia } =
    useMediaItems();
  const { updateTextContent } = useMediaMutations();
  // --------------------------

  // State to control preview visibility

  // Update preview visibility based on context/query state
  useEffect(() => {
    const shouldShow =
      (temporaryContentType === "media" && sessionHasMedia) ||
      (temporaryContentType === "text" && temporaryText.trim() !== "");
    setBehavior((prev) => ({ ...prev, showPreviews: shouldShow }));
  }, [temporaryContentType, sessionHasMedia, temporaryText]);

  // --- Step Completion Logic (Inline Check) ---
  const isStepComplete = (stepIndex) => {
    switch (stepIndex) {
      case 0: // Content
        return (
          (temporaryContentType === "media" && sessionHasMedia) ||
          (temporaryContentType === "text" && temporaryText.trim() !== "")
        );
      case 1: // Accounts
        return selectedAccounts.length > 0;
      case 2: // Caption
        // Caption completeness might depend on the mode
        // If single mode, singleCaption should not be empty (unless it's a media post where caption is optional)
        // If multiple mode, captions for selected platforms should exist
        // For now, let's consider it complete if accounts are selected (as caption is the last step)
        // More robust validation could be added later if needed
        return selectedAccounts.length > 0; // Simplistic check for now
      default:
        return false;
    }
  };

  // Check if current step is valid and can proceed to next
  const canProceed = () => {
    return isStepComplete(currentStep);
  };

  // Go to next step - Persist text if moving from step 0
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      if (currentStep === 0 && temporaryContentType === "text") {
        console.log("Persisting text content:", temporaryText);
        // Ensure temporaryText is defined before mutating
        updateTextContent.mutate(temporaryText ?? "");
      }
      setProgressCount((prev) => ({
        ...prev,
        currentStep: prev.currentStep + 1,
      }));
    }
  };

  // Go to previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setProgressCount((prev) => ({
        ...prev,
        currentStep: prev.currentStep - 1,
      }));
    }
  };

  // Handle final submission - Also persist latest text
  const handleSubmit = () => {
    if (!canProceed()) {
      console.error("Cannot submit, current step is not complete.");
      alert("Please complete the current step before submitting.");
      return;
    }
    // Always persist the latest text state before final submission if it's a text post.
    if (temporaryContentType === "text") {
      console.log("Persisting final text content:", temporaryText);
      updateTextContent.mutate(temporaryText ?? "", {
        onSuccess: () => {
          console.log("Text persisted. Proceeding with submission...");
          proceedWithSubmission();
        },
        onError: (error) => {
          console.error("Failed to persist text before submission:", error);
          alert("Failed to save post content. Please try again.");
        },
      });
    } else {
      // If it's a media post, proceed directly
      proceedWithSubmission();
    }
  };

  const proceedWithSubmission = () => {
    // Construct submission data from contexts and query
    const submissionData = {
      contentType: temporaryContentType,
      // Use temporaryText if text post, derive caption from PostDataContext otherwise
      text:
        temporaryContentType === "text"
          ? temporaryText
          : captionMode === "single"
          ? singleCaption
          : "", // Simplistic caption for now
      media: temporaryContentType === "media" ? sessionMediaItems : [],
      accounts: selectedAccounts,
      // Pass full caption details from PostDataContext
      captions: {
        mode: captionMode,
        single: singleCaption,
        platforms: multiCaptions, // Assuming multiCaptions holds platform specifics
        scheduleType: scheduleType,
        scheduledAt: scheduledAt,
      },
    };
    console.log("Submitting post:", submissionData);
    alert("Post scheduled! Check console for data.");
    // TODO: Reset relevant states after successful submission
    // resetPostData(); // Reset accounts, schedule, caption mode etc.
    // setBehavior(initialBehaviorState); // Reset text flow context
    // clearMedia.mutate(); // Clear media from TanStack Query cache
    // setProgressCount({ currentStep: 0 }); // Reset step
  };

  if (isLoadingMedia) {
    return <div>Loading...</div>; // Add a loading indicator
  }

  return (
    <div className="w-full max-w-full space-y-6 p-6">
      <h1 className="text-2xl font-bold mb-6 max-w-5xl mx-auto">
        Create New Post
      </h1>

      {/* Main container with content and preview side by side */}
      <div className="flex flex-col lg:flex-row gap-6 max-w-5xl mx-auto">
        {/* Left side: Progress Bar, Content, and Navigation buttons together */}
        <div
          className={`flex-1 flex flex-col space-y-6 ${
            !showPreviews ? "lg:w-full" : ""
          }`}
        >
          {/* Progress Bar */}
          <div className="mb-0">
            <div className="flex items-center justify-center">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  {/* Step circle with number or check */}
                  <div
                    className={`flex items-center justify-center h-10 w-10 rounded-full border-2 ${
                      // Use isStepComplete for previous steps check
                      index < currentStep
                        ? "border-primary bg-primary text-primary-foreground"
                        : index === currentStep
                        ? "border-primary text-primary"
                        : "border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {index < currentStep ? ( // Show checkmark only if step is strictly less than current
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>

                  {/* Step name */}
                  <span
                    className={`ml-2 text-sm font-medium ${
                      index <= currentStep
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.name}
                  </span>

                  {/* Connector line */}
                  {index < steps.length - 1 && (
                    <div
                      className={`h-0.5 w-10 md:w-24 lg:w-36 ${
                        // Line color based on completion of the *previous* step
                        index < currentStep
                          ? "bg-primary"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <Card className="border-none shadow-none flex-1 p-0">
            <CardContent className="p-6">
              {currentStep === 0 && (
                // Removed onContentChange prop
                <Content />
              )}

              {currentStep === 1 && (
                // Removed onSelectionChange prop - SelectAccount uses PostDataContext directly
                <SelectAccount />
              )}

              {currentStep === 2 && (
                // Removed onCaptionChange prop - Caption uses PostDataContext directly
                // Pass selectedAccounts from context
                <Caption selectedAccounts={selectedAccounts} />
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed()}
                className="flex items-center gap-2 py-6 px-8"
                size="lg"
              >
                <SendHorizontal className="h-5 w-5" />
                Schedule Post{" "}
                {/* TODO: Text should adapt based on scheduleType */}
              </Button>
            )}
          </div>
        </div>

        {/* Right side: Preview Panel */}
        {showPreviews && (
          <div className="lg:w-[360px] mx-auto lg:mx-0">
            {/* Pass necessary data from context/query to previews */}
            {temporaryContentType === "text" ? (
              // TextPreview needs temporaryText and accounts from context
              <TextPreview />
            ) : (
              // Preview needs sessionMediaItems, temporaryText, accounts, captions etc from context/query
              <Preview />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
