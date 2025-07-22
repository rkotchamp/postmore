"use client";

import { useEffect, memo, useState } from "react";
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
import { DynamicContentSkeleton } from "@/app/dashboard/components/dashboard-skeleton";
import { useMediaMutations } from "@/app/hooks/useMediaMutations";
import { useMediaItems } from "@/app/hooks/useMediaQueries";
import { useUIStateStore } from "@/app/lib/store/uiStateStore";
import { usePostStore } from "@/app/lib/store/postStore";
import { toast } from "sonner";
import useFirebaseStorage from "@/app/hooks/useFirebaseStorage";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  // Component loading state
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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

  // Handle initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 800); // Show skeleton for 800ms minimum

    return () => clearTimeout(timer);
  }, []);

  // Show skeleton if initially loading or media is loading
  const shouldShowSkeleton = isInitialLoading || isLoadingMedia;

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
      updateTextContent.mutate(textPostContent ?? "", {
        onSuccess: () => {
          handlePostSubmission();
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

  // Add the Firebase storage hook
  const {
    uploadPostMedia,
    isUploading: isUploadingToFirebase,
    uploadResults,
  } = useFirebaseStorage();

  const handlePostSubmission = () => {
    // Show loading state right away
    useUIStateStore.getState().setIsSubmitting(true);

    // For all media posts, upload to Firebase first to satisfy database schema
    // BUT also keep the file objects for BlueSky direct upload
    if (
      postType === "media" &&
      sessionMediaItems &&
      sessionMediaItems.length > 0
    ) {
      // Filter out items that need to be uploaded (no URL)
      const itemsWithoutUrls = sessionMediaItems.filter((item) => !item.url);

      if (itemsWithoutUrls.length > 0) {
        // Extract File objects from items that need to be uploaded
        const filesToUpload = itemsWithoutUrls.map((item) => item.file);

        // Upload files to Firebase Storage
        uploadPostMedia(filesToUpload)
          .then((uploadResults) => {
            // Create a map of updated media items with the new URLs AND the file objects
            const updatedMediaItems = sessionMediaItems.map((item) => {
              // Start with current item (may already have URL)
              let updatedItem = { ...item };

              // If this item doesn't have a URL, find the upload result
              if (!item.url) {
                const uploadResult = uploadResults.find(
                  (result) =>
                    result.originalName === item.file.name ||
                    result.originalName === item.fileInfo?.name
                );

                if (uploadResult) {
                  // Keep the original file object, but add the URL from Firebase
                  updatedItem = {
                    ...item,
                    url: uploadResult.url,
                    type: uploadResult.type || item.fileInfo?.type || item.type,
                    size: uploadResult.size || item.fileInfo?.size || 0,
                  };
                }
              }

              // IMPORTANT: Always preserve the file object for BlueSky direct upload
              return {
                ...updatedItem,
                // Keep file objects to support direct upload for BlueSky
                file: item.file,
                fileObject: item.file,
                originalName:
                  item.originalName ||
                  item.file?.name ||
                  item.fileInfo?.name ||
                  "",
              };
            });

            // Now proceed with post submission (with both URLs and file objects)
            submitPost(updatedMediaItems);
          })
          .catch((error) => {
            console.error("Failed to upload media to Firebase:", error);
            toast.error("Media upload failed", {
              description:
                "We couldn't upload your media files. Please try again.",
              duration: 5000,
            });
            useUIStateStore.getState().setIsSubmitting(false);
          });
      } else {
        // All items have URLs but make sure we still add file objects for BlueSky
        const enrichedMediaItems = sessionMediaItems.map((item) => ({
          ...item,
          file: item.file,
          fileObject: item.file,
          originalName:
            item.originalName || item.file?.name || item.fileInfo?.name || "",
        }));

        // Proceed with submission with both URLs and file objects
        submitPost(enrichedMediaItems);
      }
    } else {
      // Text post or no media, proceed directly
      submitPost([]);
    }
  };

  // New function to handle the actual post submission after media is ready
  const submitPost = (mediaItems) => {
    // Get all thumbnails from postStore for videos
    const thumbnails = usePostStore.getState().thumbnails;

    // We need to include the original file objects for BlueSky videos
    // so our API can handle the direct upload without Firebase URLs
    const processedMediaItems = mediaItems.map((item) => {
      // For videos, ensure we have both the Firebase URL (for database) and
      // the raw file object (for direct upload to BlueSky)
      const isVideo =
        item.type?.startsWith("video/") ||
        item.fileInfo?.type?.startsWith("video/") ||
        (item.file && item.file.type?.startsWith("video/"));

      // If this is a video, check if we have a thumbnail for it
      let thumbnailData = null;
      if (isVideo) {
        // Create a videoId from the item (use existing id or generate from filename)
        const videoId =
          item.id ||
          `video-${item.file?.name.replace(/\.[^/.]+$/, "")}` ||
          `video-${Math.random().toString(36).slice(2, 11)}`;

        // Check if we have a thumbnail for this video in postStore
        const thumbnailFile = thumbnails[videoId];

        // If we found a thumbnail, upload it to Firebase
        if (thumbnailFile) {
          // Upload thumbnail immediately and capture promise
          const uploadThumbnailPromise = import(
            "@/app/lib/storage/firebase"
          ).then(({ uploadVideoThumbnail }) => {
            return uploadVideoThumbnail(thumbnailFile, videoId);
          });

          // Store promise for later resolution
          thumbnailData = {
            file: thumbnailFile,
            videoId: videoId,
            uploadPromise: uploadThumbnailPromise,
          };
        }
      }

      return {
        ...item,
        // Include any original file object if available
        fileObject: item.file || null,
        // For videos, make sure we have the file object for direct BlueSky upload
        file: item.file || null,
        originalName:
          item.originalName || item.file?.name || item.fileInfo?.name || "",
        // Add a flag to help the API know this is a video that needs special BlueSky handling
        isDirectUploadVideo: isVideo,
        // Add thumbnail data for later processing
        _thumbnailData: thumbnailData,
      };
    });

    // Collect all thumbnail upload promises
    const thumbnailPromises = processedMediaItems
      .filter(
        (item) => item._thumbnailData && item._thumbnailData.uploadPromise
      )
      .map((item) => item._thumbnailData.uploadPromise);

    // Wait for all thumbnail uploads to complete before continuing
    Promise.all(thumbnailPromises)
      .then((thumbnailResults) => {
        // Process each media item to include its thumbnail URL if available
        const finalMediaItems = processedMediaItems.map((item) => {
          // Remove the temporary thumbnail data property
          const { _thumbnailData, ...cleanItem } = item;

          // If this item had a thumbnail, find its upload result
          if (_thumbnailData) {
            const thumbnailResult = thumbnailResults.find(
              (result) =>
                result && result.originalName === _thumbnailData.file.name
            );

            // If thumbnail was uploaded successfully, add its URL to the item
            if (thumbnailResult) {
              return {
                ...cleanItem,
                thumbnail: thumbnailResult.url,
              };
            }
          }

          // Return the item without thumbnail
          return cleanItem;
        });

        const submissionData = {
          contentType: postType,
          text: postType === "text" ? textPostContent : "",
          media:
            postType === "media"
              ? finalMediaItems.length > 0
                ? finalMediaItems
                : sessionMediaItems
              : [],
          accounts: selectedAccounts,
          captions: {
            mode: captionMode,
            single: singleCaption,
            multiple: multiCaptions,
          },
          schedule: {
            type: scheduleType,
            at: scheduledAt,
          },
        };

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
            // Show success toast/notification
            toast.success(
              `Post ${
                scheduleType === "scheduled" ? "scheduled" : "published"
              } successfully!`,
              {
                description:
                  scheduleType === "scheduled"
                    ? `Your post will be published at ${new Date(
                        scheduledAt
                      ).toLocaleString()}`
                    : "Your post has been published to the selected platforms.",
              }
            );

            // First navigate to scheduled-posts page
            router.push("/scheduled-posts");

            // Then reset states after a slight delay to ensure navigation has started
            setTimeout(() => {
              // --- Reset States --- //
              // Reset core post configuration
              resetPostConfig();
              // Reset UI state (step, temporary text, etc.)
              resetUIState();

              // Clear media from server/cache if it was a media post
              if (postType === "media" && hasSessionMedia) {
                clearMedia.mutate();
              }

              // Clear text from server/cache if it was a text post
              if (postType === "text") {
                updateTextContent.mutate("");
              }
              // ------------------- //
            }, 100);
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

    if (shouldShowSkeleton) {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="h-6 bg-gray-200 rounded mb-4 w-24 animate-pulse"></div>
            <div className="mx-auto max-w-sm">
              <div className="bg-gray-100 rounded-3xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 bg-gray-300 rounded-full animate-pulse"></div>
                    <div>
                      <div className="h-4 bg-gray-300 rounded mb-1 w-20 animate-pulse"></div>
                      <div className="h-3 bg-gray-300 rounded w-16 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-6 w-6 bg-gray-300 rounded animate-pulse"></div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-300 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse"></div>
                  <div className="h-48 bg-gray-300 rounded-lg animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

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

  // Loading state is now handled by shouldShowSkeleton in the component render

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-6 p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 max-w-5xl mx-auto">
        Create New Post
      </h1>

      {/* Main container with content and preview side by side */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 max-w-5xl mx-auto">
        {/* Left side: Progress Bar, Content, and Navigation buttons together */}
        <div
          className={`flex-1 flex flex-col space-y-4 sm:space-y-6 ${
            !showPreviews ? "lg:w-full" : "" // Adjust width if preview is hidden
          }`}
        >
          {/* Progress Bar (Uses UI store state) */}
          <div className="mb-0">
            {" "}
            {/* Removed mb-8, adjust spacing as needed */}
            <div className="flex items-center justify-center space-x-0 overflow-x-auto px-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-shrink-0">
                  {/* Step circle using UI store currentStep */}
                  <div
                    className={`flex items-center justify-center h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 transition-colors duration-300 ${
                      index < currentStep
                        ? "border-primary bg-primary text-primary-foreground"
                        : index === currentStep
                        ? "border-primary text-primary"
                        : "border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {index < currentStep ? (
                      <CheckCircle2 className="h-4 w-4 sm:h-6 sm:w-6" />
                    ) : (
                      <span className="text-xs sm:text-sm font-medium">{index + 1}</span>
                    )}
                  </div>

                  {/* Connector line - Ensure it's correctly placed between circle+name and next circle */}
                  {index < steps.length - 1 && (
                    <div className="flex items-center">
                      <span
                        className={`ml-1 sm:ml-2 mr-1 sm:mr-2 text-xs sm:text-sm font-medium transition-colors duration-300 whitespace-nowrap ${
                          index <= currentStep
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {step.name}
                      </span>
                      <div
                        className={`h-0.5 w-6 sm:w-10 md:w-16 lg:w-20 xl:w-36 transition-colors duration-300 ${
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
                      className={`ml-1 sm:ml-2 text-xs sm:text-sm font-medium transition-colors duration-300 whitespace-nowrap ${
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
            <CardContent className="p-4 sm:p-6">
              {shouldShowSkeleton ? (
                <DynamicContentSkeleton step={currentStep} />
              ) : (
                <>
                  {currentStep === 0 && <MemoizedContent />}
                  {currentStep === 1 && <MemoizedSelectAccount />}
                  {currentStep === 2 && <MemoizedCaption />}
                </>
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons (Uses UI store state/actions) */}
          <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t gap-3 sm:gap-0">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-1 w-full sm:w-auto order-2 sm:order-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()} // Based on step completion logic
                className="flex items-center gap-1 w-full sm:w-auto order-1 sm:order-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              // Final Submit Button (Uses Post store state for text)
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting} // Add isSubmitting here
                className="flex items-center gap-2 py-3 px-4 sm:px-6 md:py-4 md:px-8 text-sm sm:text-base w-full sm:w-auto order-1 sm:order-2"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-1">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
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
                    <SendHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
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
