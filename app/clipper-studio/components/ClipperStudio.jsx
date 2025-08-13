"use client";

import { useState } from "react";
import { Upload, Link, Play } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card } from "@/app/components/ui/card";
import VideoPreview from "./VideoPreview";
import ProcessingView from "./VideoDownloader";
import ClipsGallery from "./ClipsCard";

export default function ClipperStudio() {
  const [url, setUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showProcessingView, setShowProcessingView] = useState(false);
  const [showClipsGallery, setShowClipsGallery] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setShowPreview(true);
    setIsProcessing(true);

    // Simulate initial processing
    setTimeout(() => {
      setIsProcessing(false);
    }, 2000);
  };

  const handleRemoveVideo = () => {
    setShowPreview(false);
    setUrl("");
    setIsProcessing(false);
  };

  const handleProcessVideo = () => {
    setShowProcessingView(true);
    setIsProcessing(true);
  };

  const handleProcessingComplete = () => {
    setShowClipsGallery(true);
    setShowProcessingView(false);
    setIsProcessing(false);
  };

  const handleClipSelect = (clipId) => {
    console.log("Selected clip:", clipId);
    // Handle clip selection/preview
  };

  const handleBackToStudio = () => {
    setShowClipsGallery(false);
    setShowProcessingView(false);
    setShowPreview(false);
    setUrl("");
    setIsProcessing(false);
  };

  const handleSampleProject = () => {
    setUrl("https://www.youtube.com/watch?v=sample");
    // You can trigger the sample processing here
  };

  // Show clips gallery if processing is complete
  if (showClipsGallery) {
    return (
      <ClipsGallery
        onClipSelect={handleClipSelect}
        onBack={handleBackToStudio}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5"></div>
      <div className="fixed inset-0 bg-gradient-to-tr from-transparent via-primary/3 to-transparent"></div>


      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-16">
        {/* Large Background Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <h1 className="text-[20rem] md:text-[25rem] lg:text-[30rem] font-black text-foreground/5 select-none leading-none tracking-tighter">
            Studio
          </h1>
        </div>

        <div className="w-full max-w-2xl mx-auto">
          {/* Background Circles with Gradients */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <div className="w-96 h-96 rounded-full border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"></div>
              <div className="w-64 h-64 rounded-full border border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent absolute"></div>
              <div className="w-32 h-32 rounded-full border border-primary/30 bg-gradient-to-br from-primary/10 to-secondary/5 absolute"></div>
            </div>

            {/* Floating Gradient Orbs */}
            <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 blur-xl opacity-60 animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-16 h-16 rounded-full bg-gradient-to-br from-secondary/20 to-primary/20 blur-xl opacity-60 animate-pulse delay-1000"></div>

            {/* Main Card with Loading Border */}
            <div className="relative">
              {/* Animated Loading Border */}
              {isProcessing && (
                <div className="absolute inset-0 rounded-lg p-[2px] bg-gradient-to-r from-foreground/5 via-foreground/10 to-foreground/5 dark:from-foreground/10 dark:via-foreground/20 dark:to-foreground/10 animate-spin">
                  <div className="w-full h-full bg-card/80 backdrop-blur-sm rounded-lg"></div>
                </div>
              )}

              {/* Loading Ring Animation */}
              {isProcessing && (
                <div className="absolute inset-0 rounded-lg">
                  <div className="absolute inset-0 rounded-lg border-2 border-transparent bg-gradient-to-r from-foreground/2 via-transparent to-foreground/2 dark:from-foreground/5 dark:via-transparent dark:to-foreground/5 animate-spin"></div>
                  <div
                    className="absolute inset-0 rounded-lg border-2 border-transparent bg-gradient-to-l from-foreground/1 via-transparent to-foreground/1 dark:from-foreground/3 dark:via-transparent dark:to-foreground/3 animate-spin"
                    style={{
                      animationDirection: "reverse",
                      animationDuration: "3s",
                    }}
                  ></div>
                </div>
              )}

              <Card
                className={`relative z-10 bg-card/80 backdrop-blur-sm border-border shadow-2xl p-8 transition-all duration-300 ${
                  isProcessing ? "border-foreground/5 dark:border-foreground/10" : ""
                }`}
              >
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* URL Input */}
                  <div className="space-y-4">
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <Input
                        type="url"
                        placeholder="Drop a YouTube, TikTok, or podcast link"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isProcessing}
                        className="pl-12 bg-background/50 backdrop-blur-sm border-border text-foreground placeholder-muted-foreground h-12 text-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 disabled:opacity-50"
                      />
                    </div>

                    {/* Upload Options */}
                    <div className="flex gap-4 justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isProcessing}
                        className="border-border text-foreground hover:bg-muted/50 flex items-center gap-2 bg-background/50 backdrop-blur-sm transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <Upload className="w-4 h-4" />
                        Upload
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isProcessing}
                        className="border-border text-foreground hover:bg-muted/50 flex items-center gap-2 bg-background/50 backdrop-blur-sm transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google Drive
                      </Button>
                    </div>
                  </div>

                  {/* Main Action Button */}
                  <Button
                    type="submit"
                    disabled={!url.trim() || isProcessing}
                    className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Play className="w-5 h-5" />
                        Get clips in 1 click
                      </div>
                    )}
                  </Button>

                  {/* Sample Project Link */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleSampleProject}
                      disabled={isProcessing}
                      className="text-muted-foreground hover:text-primary underline text-sm transition-colors duration-200 hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 px-2 py-1 rounded disabled:opacity-50"
                    >
                      Click here to try a sample project
                    </button>
                  </div>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </div>
      {/* Video Preview Component */}
      {showPreview && !showProcessingView && (
        <div className="relative z-10 px-4 pb-16">
          <VideoPreview
            videoUrl={url}
            onRemove={handleRemoveVideo}
            onProcess={handleProcessVideo}
          />
        </div>
      )}

      {/* Processing View Component */}
      {showProcessingView && (
        <div className="relative z-10 pb-16">
          <ProcessingView
            videoUrl={url}
            videoTitle="Subtle, yet Beautiful Scroll Animation Tutorial"
            onProcessingComplete={handleProcessingComplete}
          />
        </div>
      )}
    </div>
  );
}
