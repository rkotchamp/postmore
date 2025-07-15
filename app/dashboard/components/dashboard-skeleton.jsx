"use client";

import { Card, CardContent } from "@/app/components/ui/card";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Button } from "@/app/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left side: Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step Navigation */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                {/* Step circles and connectors */}
                <div className="flex items-center space-x-4">
                  {[1, 2, 3].map((step, index) => (
                    <div key={step} className="flex items-center">
                      <div className="flex items-center">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-16 ml-2" />
                      </div>
                      {index < 2 && <Skeleton className="h-0.5 w-20 ml-4" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Step Content */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <ContentSkeleton />
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-4 border-t bg-white rounded-lg p-4 shadow-sm">
              <Button
                variant="outline"
                disabled
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button disabled className="flex items-center gap-1">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right side: Preview Panel */}
          <div className="space-y-6">
            <PreviewSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

// Content section skeleton
function ContentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Upload area */}
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-8">
        <div className="text-center">
          <Skeleton className="h-16 w-16 mx-auto mb-4 rounded-full" />
          <Skeleton className="h-6 w-48 mx-auto mb-2" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>

      {/* Media grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <Card key={item} className="aspect-square">
            <CardContent className="p-2">
              <Skeleton className="h-full w-full rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

// Accounts section skeleton
function AccountsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Connected accounts */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((account) => (
          <Card key={account} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-6 w-6 rounded" />
            </div>
          </Card>
        ))}
      </div>

      {/* Add account button */}
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

// Caption section skeleton
function CaptionSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Caption input */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-32 w-full" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      {/* Schedule toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>

      {/* Schedule settings */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-4 w-12 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div>
            <Skeleton className="h-4 w-12 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div>
          <Skeleton className="h-4 w-16 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

// Preview section skeleton
function PreviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Preview header */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <Skeleton className="h-6 w-24 mb-4" />

        {/* Phone mockup */}
        <div className="mx-auto max-w-sm">
          <div className="bg-gray-100 rounded-3xl p-6 shadow-lg">
            {/* Phone header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-6 w-6" />
            </div>

            {/* Content area */}
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>

            {/* Interaction buttons */}
            <div className="flex justify-between items-center mt-4">
              <div className="flex space-x-4">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-6 w-6" />
              </div>
              <Skeleton className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Selected accounts */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((account) => (
            <div key={account} className="flex items-center space-x-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Dynamic skeleton based on current step
export function DynamicContentSkeleton({ step = 0 }) {
  switch (step) {
    case 0:
      return <ContentSkeleton />;
    case 1:
      return <AccountsSkeleton />;
    case 2:
      return <CaptionSkeleton />;
    default:
      return <ContentSkeleton />;
  }
}
