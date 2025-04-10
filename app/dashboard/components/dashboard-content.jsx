"use client";

import { useState, useEffect, useCallback } from "react";
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

// Steps for post creation process
const steps = [
  { id: "content", name: "Content" },
  { id: "accounts", name: "Accounts" },
  { id: "caption", name: "Caption" },
];

export function DashboardContent() {
  // Current step in the process
  const [currentStep, setCurrentStep] = useState(0);

  // State to control preview visibility
  const [showPreview, setShowPreview] = useState(false);

  // Store data from each step
  const [postData, setPostData] = useState({
    content: { type: null, isValid: false, data: null },
    accounts: [],
    captions: {},
  });

  // Track whether each step is completed
  const [stepsCompleted, setStepsCompleted] = useState({
    content: false,
    accounts: false,
    caption: false,
  });

  // Update preview visibility whenever content changes
  useEffect(() => {
    setShowPreview(hasMediaContent());
  }, [postData.content]);

  // Check if current step is valid and can proceed to next
  const canProceed = () => {
    switch (currentStep) {
      case 0: // Content
        return postData.content.isValid;
      case 1: // Accounts
        return postData.accounts.length > 0;
      case 2: // Caption
        return Object.keys(postData.captions).length > 0;
      default:
        return false;
    }
  };

  // Handle content changes - wrapped in useCallback for stable reference
  const handleContentChange = useCallback((contentData) => {
    setPostData((prev) => ({
      ...prev,
      content: contentData,
    }));
    setStepsCompleted((prev) => ({
      ...prev,
      content: contentData.isValid,
    }));
  }, []); // Empty dependency array to ensure stable reference

  // Handle account selection changes
  const handleAccountSelection = useCallback((selectedAccounts) => {
    console.log("Selection changed:", selectedAccounts);
    // Only update state if we have a valid selection
    if (Array.isArray(selectedAccounts)) {
      setPostData((prev) => ({
        ...prev,
        accounts: selectedAccounts,
      }));
      setStepsCompleted((prev) => ({
        ...prev,
        accounts: selectedAccounts.length > 0,
      }));
    }
  }, []);

  // Handle caption changes
  const handleCaptionChange = useCallback((captionData) => {
    // Prevent unnecessary updates
    if (!captionData || Object.keys(captionData).length === 0) return;

    // Use functional updates to avoid stale closure issues
    setPostData((prev) => {
      // Skip update if captions haven't changed
      if (JSON.stringify(prev.captions) === JSON.stringify(captionData)) {
        return prev;
      }

      return {
        ...prev,
        captions: captionData,
      };
    });

    // Update completion status
    setStepsCompleted((prev) => {
      const isComplete = Object.keys(captionData).length > 0;
      // Skip update if completion status hasn't changed
      if (prev.caption === isComplete) {
        return prev;
      }

      return {
        ...prev,
        caption: isComplete,
      };
    });
  }, []);

  // Go to next step
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  // Go to previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Handle final submission
  const handleSubmit = () => {
    console.log("Submitting post:", postData);
    // Here you would send the data to your API
    alert("Post scheduled! Check console for data.");
  };

  // Check if media content is available
  const hasMediaContent = () => {
    // For media type, ensure there's actually a media preview
    if (postData.content.type === "media") {
      return postData.content.data?.media ? true : false;
    }

    // For carousel, check if there's at least one item
    if (postData.content.type === "carousel") {
      return (
        postData.content.data?.carousel &&
        postData.content.data.carousel.length > 0
      );
    }

    // For text posts, check if there's actual text content
    if (postData.content.type === "text") {
      return (
        postData.content.data?.text && postData.content.data?.text.trim() !== ""
      );
    }

    // Default case - no valid content
    return false;
  };

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
            !showPreview ? "lg:w-full" : ""
          }`}
        >
          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  {/* Step circle with number or check */}
                  <div
                    className={`flex items-center justify-center h-10 w-10 rounded-full border-2 ${
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
                      className={`h-0.5 w-10 md:w-24 lg:w-36 mx-2 ${
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
          <Card className="border shadow-sm flex-1">
            <CardContent className="p-6">
              {currentStep === 0 && (
                <Content onContentChange={handleContentChange} />
              )}

              {currentStep === 1 && (
                <SelectAccount onSelectionChange={handleAccountSelection} />
              )}

              {currentStep === 2 && (
                <Caption
                  selectedAccounts={postData.accounts}
                  onCaptionChange={handleCaptionChange}
                />
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
                Schedule Post
              </Button>
            )}
          </div>
        </div>

        {/* Right side: Preview Panel - Only show when media content is available */}
        {showPreview && (
          <div className="lg:w-[360px] mx-auto lg:mx-0">
            <Preview
              content={postData.content}
              accounts={postData.accounts}
              captions={postData.captions}
            />
          </div>
        )}
      </div>
    </div>
  );
}
