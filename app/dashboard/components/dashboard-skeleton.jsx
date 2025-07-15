"use client";

import { Skeleton } from "@/app/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-6 bg-gray-800" />

          {/* Step Navigation */}
          <div className="flex items-center justify-center space-x-16 mb-8">
            {/* Step 1 - Content (Active) */}
            <div className="flex items-center space-x-3">
              <Skeleton className="w-10 h-10 rounded-full bg-purple-600" />
              <Skeleton className="h-4 w-16 bg-gray-700" />
            </div>

            {/* Connector line */}
            <div className="flex-1 h-0.5 bg-gray-600 max-w-[200px]"></div>

            {/* Step 2 - Accounts (Inactive) */}
            <div className="flex items-center space-x-3">
              <Skeleton className="w-10 h-10 rounded-full bg-gray-600" />
              <Skeleton className="h-4 w-20 bg-gray-700" />
            </div>

            {/* Connector line */}
            <div className="flex-1 h-0.5 bg-gray-600 max-w-[200px]"></div>

            {/* Step 3 - Caption (Inactive) */}
            <div className="flex items-center space-x-3">
              <Skeleton className="w-10 h-10 rounded-full bg-gray-600" />
              <Skeleton className="h-4 w-16 bg-gray-700" />
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="mb-8">
          <div className="flex space-x-4 mb-6">
            {/* Media Tab (Active) */}
            <div className="flex-1 bg-blue-600 py-3 rounded-lg flex items-center justify-center space-x-2">
              <Skeleton className="w-5 h-5 bg-blue-500" />
              <Skeleton className="h-4 w-12 bg-blue-500" />
            </div>

            {/* Text Tab (Inactive) */}
            <div className="flex-1 bg-gray-700 py-3 rounded-lg flex items-center justify-center space-x-2">
              <Skeleton className="w-5 h-5 bg-gray-600" />
              <Skeleton className="h-4 w-8 bg-gray-600" />
            </div>
          </div>
        </div>

        {/* Media Post Section */}
        <div className="mb-8">
          <Skeleton className="h-6 w-24 mb-6 bg-gray-800" />

          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-16 text-center">
            <div className="flex flex-col items-center space-y-4">
              <Skeleton className="w-12 h-12 bg-gray-600" />
              <Skeleton className="h-5 w-64 bg-gray-700" />
              <Skeleton className="h-4 w-32 bg-gray-700" />
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6">
          <div className="flex items-center space-x-2 px-4 py-2 bg-gray-700 rounded-lg opacity-50">
            <Skeleton className="w-4 h-4 bg-gray-600" />
            <Skeleton className="h-4 w-16 bg-gray-600" />
          </div>

          <div className="flex items-center space-x-2 px-6 py-2 bg-purple-600 rounded-lg">
            <Skeleton className="h-4 w-8 bg-purple-500" />
            <Skeleton className="w-4 h-4 bg-purple-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple content skeleton for step-specific loading
export function DynamicContentSkeleton({ step = 0 }) {
  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-gray-600 rounded-lg p-16 text-center">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="w-12 h-12 bg-gray-600" />
          <Skeleton className="h-5 w-32 bg-gray-700" />
        </div>
      </div>
    </div>
  );
}
