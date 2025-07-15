"use client";

import { Upload } from "lucide-react";

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-6">Create New Post</h1>

          {/* Step Navigation */}
          <div className="flex items-center justify-center space-x-16 mb-8">
            {/* Step 1 - Content (Active) */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                1
              </div>
              <span className="text-white font-medium">Content</span>
            </div>

            {/* Connector line */}
            <div className="flex-1 h-0.5 bg-gray-600 max-w-[200px]"></div>

            {/* Step 2 - Accounts (Inactive) */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-gray-400 font-medium">
                2
              </div>
              <span className="text-gray-400 font-medium">Accounts</span>
            </div>

            {/* Connector line */}
            <div className="flex-1 h-0.5 bg-gray-600 max-w-[200px]"></div>

            {/* Step 3 - Caption (Inactive) */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-gray-400 font-medium">
                3
              </div>
              <span className="text-gray-400 font-medium">Caption</span>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="mb-8">
          <div className="flex space-x-4 mb-6">
            {/* Media Tab (Active) */}
            <button className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2">
              <Upload className="w-5 h-5" />
              <span>Media</span>
            </button>

            {/* Text Tab (Inactive) */}
            <button className="flex-1 bg-gray-700 text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2">
              <span>📝</span>
              <span>Text</span>
            </button>
          </div>
        </div>

        {/* Media Post Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-6">Media Post</h2>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-16 text-center">
            <div className="flex flex-col items-center space-y-4">
              <Upload className="w-12 h-12 text-gray-400" />
              <div className="text-lg text-gray-300">
                Drag and drop video or up to 10 images
              </div>
              <div className="text-gray-400">or click to browse</div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6">
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-gray-400 rounded-lg opacity-50 cursor-not-allowed">
            <span>←</span>
            <span>Previous</span>
          </button>

          <button className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg">
            <span>Next</span>
            <span>→</span>
          </button>
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
          <Upload className="w-12 h-12 text-gray-400" />
          <div className="text-lg text-gray-300">Loading...</div>
        </div>
      </div>
    </div>
  );
}
