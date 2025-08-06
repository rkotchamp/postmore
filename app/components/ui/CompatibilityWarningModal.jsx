"use client";

import { X, AlertTriangle } from 'lucide-react';

export default function CompatibilityWarningModal({ 
  isOpen, 
  onClose, 
  onContinue, 
  onCancel,
  compatibilityResult 
}) {
  if (!isOpen || !compatibilityResult || compatibilityResult.isCompatible) {
    return null;
  }

  const { affectedPlatforms, incompatibleItems } = compatibilityResult;
  
  // Determine if it's image or video based on file types
  const hasImages = incompatibleItems.some(item => item.fileType === 'image');
  const hasVideos = incompatibleItems.some(item => item.fileType === 'video');
  
  let contentTypeText;
  if (hasImages && hasVideos) {
    contentTypeText = 'images and videos';
  } else if (hasImages) {
    contentTypeText = 'images';
  } else if (hasVideos) {
    contentTypeText = 'videos';
  } else {
    contentTypeText = 'content';
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Incompatible Content
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            Your {contentTypeText} cannot be posted to{' '}
            <strong>{Array.from(affectedPlatforms).join(', ')}</strong> because {affectedPlatforms.size > 1 ? 'these platforms don\'t' : 'this platform doesn\'t'} support {contentTypeText}.
          </p>
          
          <p className="text-sm text-gray-600">
            {affectedPlatforms.size > 1 ? 'These platforms' : 'This platform'} will be skipped if you continue.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onContinue}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    </div>
  );
}