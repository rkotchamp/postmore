"use client";

import { useEffect, memo } from "react";
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
import { useUIStateStore } from "@/app/lib/store/uiStateStore";
import { usePostStore } from "@/app/lib/store/postStore";
import { toast } from "sonner";

// Steps for post creation process
const steps = [
  { id: "content", name: "Content" },
  { id: "accounts", name: "Accounts" },
  { id: "caption", name: "Caption" },
];

// Memoize the step content components
const MemoizedContent = memo(() => <Content />);
const MemoizedSelectAccount = memo(() => <SelectAccount />);
const MemoizedCaption = memo(() => <Caption />);

// Use these memoized components in the conditional rendering
// Replace the direct component usage with the memoized versions in the CardContent

// Memoize the Preview rendering function to prevent unnecessary re-renders
const MemoizedPreview = memo(() => <Preview />);
const MemoizedTextPreview = memo(() => <TextPreview />);

export function DashboardContent() {
  // Test toast function

  // --- UI Zustand State ---
  const currentStep = useUIStateStore((state) => state.currentStep);
  const setCurrentStep = useUIStateStore((state) => state.setCurrentStep);
  const postType = useUIStateStore((state) => state.postType);
  const textPostContent = useUIStateStore((state) => state.textPostContent);
  const setTextPostContent = useUIStateStore(
    (state) => state.setTextPostContent
  );
  const resetUIState = useUIStateStore((state) => state.resetUIState);
  const isSubmitting = useUIStateStore((state) => state.isSubmitting);
  // ----------------------

  // --- Post Config Zustand State & Actions ---
  const selectedAccounts = usePostStore((state) => state.selectedAccounts);
  const captionMode = usePostStore((state) => state.captionMode);
  const singleCaption = usePostStore((state) => state.singleCaption);
  const multiCaptions = usePostStore((state) => state.multiCaptions);
  const scheduleType = usePostStore((state) => state.scheduleType);
  const scheduledAt = usePostStore((state) => state.scheduledAt);
  const resetPostConfig = usePostStore((state) => state.resetPostConfig);
  // ------------------------------------------

  // --- TanStack Query State ---
  const { data: sessionMediaItems = [], isLoading: isLoadingMedia } =
    useMediaItems();
  const { updateTextContent, clearMedia } = useMediaMutations();
  // --------------------------

  // --- Calculate derived state directly --- (Inputs now from Zustand stores)
  const hasSessionMedia = sessionMediaItems.length > 0;
  const canShowMedia = postType === "media" && hasSessionMedia;
  const canShowText = postType === "text" && textPostContent.trim() !== "";
  const showPreviews = canShowMedia || canShowText;
  // ---------------------------------------

  // --- Step Completion Logic --- (Inputs now from Zustand stores)
  const isStepComplete = (stepIndex) => {
    switch (stepIndex) {
      case 0: // Content
        return canShowMedia || canShowText;
      case 1: // Accounts
        return selectedAccounts.length > 0;
      case 2: // Caption
        // Caption step is always considered completable once reached, maybe add validation?
        // For now, just reaching it with selected accounts is enough.
        return selectedAccounts.length > 0;
      default:
        return false;
    }
  };

  const canProceed = () => {
    return isStepComplete(currentStep);
  };

  // --- Navigation Handlers --- (Use UI store actions)
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      if (currentStep === 0 && postType === "text") {
        updateTextContent.mutate(textPostContent ?? "");
      }
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // --- Submission --- (Use state from both stores, TanStack)
  const handleSubmit = () => {
    if (!canProceed()) {
      console.error("Cannot submit, current step is not complete.");
      // Consider using a toast notification library instead of alert
      alert("Please complete the current step before submitting.");
      return;
    }

    // Ensure latest text is persisted if it's a text post
    if (postType === "text") {
      console.log(
        "Persisting final text content before submission:",
        textPostContent
      );
      updateTextContent.mutate(textPostContent ?? "", {
        onSuccess: () => {
          console.log("Text persisted just before submission. Proceeding...");
          proceedWithSubmission();
        },
        onError: (error) => {
          console.error("Failed to persist text before submission:", error);
          alert(
            "Failed to save post content right before submission. Please try again."
          );
        },
      });
    } else {
      // For media posts, TanStack Query cache should hold the latest media state
      handlePostSubmission();
    }
  };

  const handlePostSubmission = () => {
    const submissionData = {
      contentType: postType, // From UI Store
      text: postType === "text" ? textPostContent : "", // From UI Store
      media: postType === "media" ? sessionMediaItems : [], // From TanStack Query
      accounts: selectedAccounts, // From Post Store
      captions: {
        // From Post Store
        mode: captionMode,
        single: singleCaption,
        multipleCaptions: multiCaptions,
      },
      schedule: {
        // From Post Store
        type: scheduleType,
        at: scheduledAt,
      },
    };
    console.log("Submitting post:", submissionData);

    // Show loading state
    useUIStateStore.getState().setIsSubmitting(true);

    // Send the data to our API endpoint
    fetch("/api/posts/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submissionData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Post submission successful:", data);

        // Show success toast/notification
        toast({
          title: `Post ${
            scheduleType === "scheduled" ? "scheduled" : "published"
          } successfully!`,
          description:
            scheduleType === "scheduled"
              ? `Your post will be published at ${new Date(
                  scheduledAt
                ).toLocaleString()}`
              : "Your post has been published to the selected platforms.",
          variant: "success",
        });

        // --- Reset States --- //
        // Reset core post configuration
        resetPostConfig();
        // Reset UI state (step, temporary text, etc.)
        resetUIState();

        // Clear media from server/cache if it was a media post
        if (postType === "media" && hasSessionMedia) {
          clearMedia.mutate();
        }

        // Clear text from server/cache if it was a text post (resetting temporaryText above handled UI)
        if (postType === "text") {
          updateTextContent.mutate("");
        }
        // ------------------- //
      })
      .catch((error) => {
        console.error("Error submitting post:", error);

        // Show a more detailed error toast for debugging
        toast.error("Failed to submit post", {
          description: `Error: ${error.message || "Unknown error"}. ${
            error.stack ? "Check console for details." : ""
          }`,
          duration: 5000,
        });
      })
      .finally(() => {
        // Hide loading state
        useUIStateStore.getState().setIsSubmitting(false);
      });
  };

  // Decide which preview to show (Uses UI store state)
  const renderPreview = () => {
    if (!showPreviews) return null;

    if (postType === "text") {
      return <MemoizedTextPreview />;
    } else {
      return <MemoizedPreview />;
    }
  };

  // Get button text (Uses Post store state)
  const getSubmitButtonText = () => {
    return scheduleType === "scheduled" ? "Schedule Post" : "Post Now";
  };

  // Loading state from TanStack Query
  if (isLoadingMedia) {
    // Consider a more sophisticated loading skeleton
    return <div>Loading Content Editor...</div>;
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
            !showPreviews ? "lg:w-full" : "" // Adjust width if preview is hidden
          }`}
        >
          {/* Progress Bar (Uses UI store state) */}
          <div className="mb-0">
            {" "}
            {/* Removed mb-8, adjust spacing as needed */}
            <div className="flex items-center justify-center space-x-0">
              {" "}
              {/* Use space-x-0 on parent */}
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  {/* Step circle using UI store currentStep */}
                  <div
                    className={`flex items-center justify-center h-10 w-10 rounded-full border-2 transition-colors duration-300 ${
                      index < currentStep
                        ? "border-primary bg-primary text-primary-foreground"
                        : index === currentStep
                        ? "border-primary text-primary"
                        : "border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {index < currentStep ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>

                  {/* Connector line - Ensure it's correctly placed between circle+name and next circle */}
                  {index < steps.length - 1 && (
                    <div className="flex items-center">
                      <span
                        className={`ml-2 mr-2 text-sm font-medium transition-colors duration-300 ${
                          index <= currentStep
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.name}
                      </span>
                      <div
                        className={`h-0.5 w-10 md:w-16 lg:w-20 xl:w-36 transition-colors duration-300 ${
                          index < currentStep
                            ? "bg-primary"
                            : "bg-muted-foreground/30"
                        }`}
                      />
                    </div>
                  )}
                  {/* Render last step name separately */}
                  {index === steps.length - 1 && (
                    <span
                      className={`ml-2 text-sm font-medium transition-colors duration-300 ${
                        index <= currentStep
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content - Render conditionally based on UI store currentStep */}
          <Card className="border-none shadow-none flex-1 p-0">
            <CardContent className="p-6">
              {currentStep === 0 && <MemoizedContent />}
              {currentStep === 1 && <MemoizedSelectAccount />}
              {currentStep === 2 && <MemoizedCaption />}
            </CardContent>
          </Card>

          {/* Navigation Buttons (Uses UI store state/actions) */}
          <div className="flex justify-between items-center pt-4 border-t">
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
                disabled={!canProceed()} // Based on step completion logic
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              // Final Submit Button (Uses Post store state for text)
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting} // Add isSubmitting here
                className="flex items-center gap-2 py-3 px-6 md:py-4 md:px-8 text-base"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-1">
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </span>
                    {scheduleType === "scheduled"
                      ? "Scheduling..."
                      : "Posting..."}
                  </>
                ) : (
                  <>
                    <SendHorizontal className="h-5 w-5" />
                    {getSubmitButtonText()}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Right side: Preview Panel - Conditionally render based on derived state */}
        {renderPreview()}
      </div>
    </div>
  );
}
