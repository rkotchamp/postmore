"use client";

import { useEffect, useState } from 'react';

export function PostSubmissionModal({ isOpen, step = 1 }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(0);

  // Update step when prop changes
  useEffect(() => {
    if (step > currentStep) {
      setCurrentStep(step);
    }
  }, [step, currentStep]);

  // Smooth progress animation based on step
  useEffect(() => {
    let targetProgress;
    switch (currentStep) {
      case 1:
        targetProgress = 15;
        break;
      case 2:
        targetProgress = 50;
        break;
      case 3:
        targetProgress = 85;
        break;
      case 4:
        targetProgress = 100;
        break;
      default:
        targetProgress = 0;
    }

    if (targetProgress > progress) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const next = prev + 2;
          if (next >= targetProgress) {
            clearInterval(interval);
            return targetProgress;
          }
          return next;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [currentStep, progress]);

  if (!isOpen) return null;

  const getStepText = () => {
    switch (currentStep) {
      case 1:
        return "Preparing your post...";
      case 2:
        return "Uploading content...";
      case 3:
        return "Publishing to platforms...";
      case 4:
        return "Finalizing...";
      default:
        return "Processing...";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 shadow-xl">
        <div className="text-center">
          {/* Spinner */}
          <div className="mb-6">
            <div className="animate-spin mx-auto h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
          
          {/* Step text */}
          <h3 className="text-lg font-semibold mb-6 text-gray-800">{getStepText()}</h3>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
            <div 
              className="bg-primary h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          {/* Progress percentage */}
          <p className="text-sm text-gray-500 font-medium">{Math.round(progress)}%</p>
          
          {/* Step indicator */}
          <p className="text-xs text-gray-400 mt-2">Step {currentStep} of 4</p>
        </div>
      </div>
    </div>
  );
}