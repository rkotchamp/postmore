"use client";

import { useState, useCallback } from "react";
import { Upload, Link, Play } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card } from "@/app/components/ui/card";
import ProcessingView from "./VideoDownloader";
import ClipsGallery from "./ClipsCard";
import { getThumbnail } from "../../lib/video-processing/utils/thumbnailExtractor";
import { useClipperStudioStore } from "../../lib/store/clipperStudioStore";
import { useClipperMutations } from "../../hooks/useClipperMutations";

export default function ClipperStudio() {
  // Use Zustand store instead of local state
  const {
    url,
    uploadedFile, 
    hasVideo,
    isLoadingPreview,
    isLoadingProcessing,
    isExtractingThumbnail,
    previewThumbnail,
    previewMetadata,
    activeProjects,
    showClipsGallery,
    setUrl,
    setUploadedFile,
    setHasVideo,
    setLoadingPreview,
    setLoadingProcessing,
    setExtractingThumbnail,
    setPreviewThumbnail,
    setPreviewMetadata,
    setShowClipsGallery,
    addProject,
    updateProject,
    clearPreview,
    getCurrentInput,
    isInputValid,
    canStartProcessing,
    cacheThumbnail,
    getCachedThumbnail,
    removeProject
  } = useClipperStudioStore();

  // Use TanStack Query mutations
  const {
    createProject,
    processVideoFile,
    isProcessing,
    progress,
    error,
    deleteProject,
    saveProject
  } = useClipperMutations();

  const handleVideoUrlSubmit = async (e) => {
    e.preventDefault();
    if (!isInputValid()) return;

    console.log('🎬 [CLIPPER] Starting video preview extraction...');
    setLoadingPreview(true);
    setExtractingThumbnail(true);
    
    try {
      const input = getCurrentInput();
      const cacheKey = typeof input === 'string' ? input : input.name;
      
      // Check cache first
      const cachedThumbnail = getCachedThumbnail(cacheKey);
      if (cachedThumbnail) {
        console.log('🎯 [CACHE] Using cached thumbnail');
        setPreviewThumbnail(cachedThumbnail);
        setHasVideo(true);
        return;
      }
      
      console.log(`📹 [CLIPPER] Extracting thumbnail for: ${uploadedFile ? uploadedFile.name : url}`);
      
      // For uploaded files, process them with thumbnail integration
      if (uploadedFile) {
        const processedData = await processVideoFile(uploadedFile);
        const thumbnailUrl = processedData.thumbnailUrl || createPlaceholderSvg("Video File");
        
        cacheThumbnail(cacheKey, thumbnailUrl);
        setPreviewThumbnail(thumbnailUrl);
        setPreviewMetadata({
          title: processedData.originalVideo?.filename || uploadedFile.name,
          duration: processedData.originalVideo?.duration || 0,
          width: processedData.originalVideo?.width,
          height: processedData.originalVideo?.height,
          size: processedData.originalVideo?.size,
          type: processedData.originalVideo?.type
        });
      } else {
        // For URLs, use the existing thumbnail extraction
        const thumbnailData = await getThumbnail(input);
        
        console.log('✅ [CLIPPER] Thumbnail extracted successfully:', thumbnailData.title);
        
        cacheThumbnail(cacheKey, thumbnailData.thumbnail);
        setPreviewThumbnail(thumbnailData.thumbnail);
        setPreviewMetadata({
          title: thumbnailData.title,
          duration: thumbnailData.duration,
          uploader: thumbnailData.uploader,
          width: thumbnailData.width,
          height: thumbnailData.height
        });
      }
      
      setHasVideo(true);
      
    } catch (error) {
      console.error('❌ [CLIPPER] Preview extraction failed:', error);
      const fallbackThumbnail = createPlaceholderSvg("Error Loading Video");
      setHasVideo(true);
      setPreviewThumbnail(fallbackThumbnail);
      setPreviewMetadata({
        title: uploadedFile ? uploadedFile.name : "Video from URL",
        duration: 0,
        uploader: "Unknown"
      });
    } finally {
      setLoadingPreview(false);
      setExtractingThumbnail(false);
    }
  };

  // Helper function to create placeholder SVG data URLs
  const createPlaceholderSvg = (text) => {
    const svg = `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#374151"/>
      <text x="150" y="100" text-anchor="middle" fill="white" font-family="Arial" font-size="16">${text}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const handleRemoveVideoUrl = () => {
    clearPreview();
  };

  const onDrop = useCallback(async (acceptedFiles, rejectedFiles, event) => {
    // Handle file drops
    const file = acceptedFiles[0];
    if (file) {
      console.log('📁 [CLIPPER] File dropped:', file.name);
      setUploadedFile(file);
      setLoadingPreview(true);
      setExtractingThumbnail(true);
      
      try {
        // Extract thumbnail from uploaded file
        const thumbnailData = await getThumbnail(file);
        
        console.log('✅ [CLIPPER] File thumbnail generated successfully');
        
        setPreviewThumbnail(thumbnailData.thumbnail);
        setPreviewMetadata({
          title: thumbnailData.title,
          duration: thumbnailData.duration,
          width: thumbnailData.width,
          height: thumbnailData.height,
          size: thumbnailData.size,
          type: thumbnailData.type
        });
        
        setHasVideo(true);
        
      } catch (error) {
        console.error('❌ [CLIPPER] File thumbnail generation failed:', error);
        // Still allow processing
        setHasVideo(true);
        setPreviewThumbnail("/placeholder.svg?height=200&width=300&text=Video+File");
        setPreviewMetadata({
          title: file.name.replace(/\.[^/.]+$/, ""),
          duration: 0,
          size: file.size,
          type: file.type
        });
      } finally {
        setLoadingPreview(false);
        setExtractingThumbnail(false);
      }
      return;
    }

    // Handle URL/text drops
    const dataTransfer = event?.dataTransfer;
    if (dataTransfer) {
      const droppedText = dataTransfer.getData('text/plain');
      const droppedUrl = dataTransfer.getData('text/uri-list');
      
      const urlToDrop = droppedUrl || droppedText;
      
      if (urlToDrop && isValidVideoUrl(urlToDrop)) {
        console.log('🔗 [CLIPPER] URL dropped:', urlToDrop);
        setUrl(urlToDrop);
        setLoadingPreview(true);
        setExtractingThumbnail(true);
        
        try {
          // Extract thumbnail from URL
          const thumbnailData = await getThumbnail(urlToDrop);
          
          console.log('✅ [CLIPPER] URL thumbnail extracted successfully:', thumbnailData.title);
          
          setPreviewThumbnail(thumbnailData.thumbnail);
          setPreviewMetadata({
            title: thumbnailData.title,
            duration: thumbnailData.duration,
            uploader: thumbnailData.uploader,
            width: thumbnailData.width,
            height: thumbnailData.height
          });
          
          setHasVideo(true);
          
        } catch (error) {
          console.error('❌ [CLIPPER] URL thumbnail extraction failed:', error);
          // Still allow processing
          setHasVideo(true);
          setPreviewThumbnail("/placeholder.svg?height=200&width=300&text=Video+URL");
          setPreviewMetadata({
            title: "Video from URL",
            duration: 0,
            uploader: "Unknown"
          });
        } finally {
          setLoadingPreview(false);
          setExtractingThumbnail(false);
        }
      }
    }
  }, []);

  // Helper function to validate video URLs
  const isValidVideoUrl = (url) => {
    const videoUrlPatterns = [
      /youtube\.com\/watch\?v=/,
      /youtu\.be\//,
      /tiktok\.com\//,
      /instagram\.com\/reel/,
      /instagram\.com\/p/,
      /vimeo\.com\//,
      /twitch\.tv\//,
      /kick\.com\//,
      /rumble\.com\//,
      /\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i
    ];
    
    return videoUrlPatterns.some(pattern => pattern.test(url));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv']
    },
    maxFiles: 1,
    disabled: isLoadingPreview || isLoadingProcessing,
    noClick: true, // Disable click to open file picker on the entire drop zone
    noKeyboard: false,
    multiple: false
  });

  const handleStartVideoProcessing = async () => {
    setLoadingProcessing(true);
    
    try {
      console.log('🚀 [CLIPPER] Starting video processing...');
      
      // Upload thumbnail to Firebase if it's a base64 data URL
      let firebaseThumbnailUrl = previewThumbnail;
      
      if (previewThumbnail && previewThumbnail.startsWith('data:image/')) {
        try {
          console.log('📤 [FIREBASE] Uploading thumbnail to Firebase...');
          
          // Convert base64 to File for upload
          const response = await fetch(previewThumbnail);
          const blob = await response.blob();
          const timestamp = Date.now();
          const file = new File([blob], `thumbnail_${timestamp}.jpg`, { type: 'image/jpeg' });
          
          // Upload to Firebase
          const { uploadClipperThumbnail } = await import('@/app/lib/storage/firebase');
          const uploadResult = await uploadClipperThumbnail(file, `processed_${timestamp}`);
          firebaseThumbnailUrl = uploadResult.url;
          
          console.log('✅ [FIREBASE] Thumbnail uploaded successfully');
        } catch (uploadError) {
          console.warn('⚠️ [FIREBASE] Thumbnail upload failed, using base64:', uploadError.message);
          // Keep the base64 URL as fallback
        }
      }
      
      // Create project with Firebase thumbnail URL
      const projectData = {
        sourceType: uploadedFile ? 'upload' : 'url',
        sourceUrl: uploadedFile ? undefined : url,
        originalVideo: {
          filename: uploadedFile ? uploadedFile.name : previewMetadata?.title || 'Video',
          size: uploadedFile ? uploadedFile.size : undefined,
          type: uploadedFile ? uploadedFile.type : 'video/*',
          thumbnailUrl: firebaseThumbnailUrl, // Firebase URL for persistence
          url: uploadedFile ? undefined : url, // Store source URL for URL-based videos
          ...previewMetadata
        },
        metadata: previewMetadata
      };

      // Create the project using TanStack mutation
      const result = await createProject.mutateAsync(projectData);
      
      console.log('✅ [CLIPPER] Project created successfully:', result);
      console.log('📊 [CLIPPER] Project data:', result.project);
      
      // Add project to local store for UI updates
      const newProject = {
        id: result.project.id,
        url: url,
        file: uploadedFile,
        title: previewMetadata?.title || (uploadedFile ? uploadedFile.name : "Video Processing"),
        status: "processing",
        progress: 0,
        createdAt: new Date(),
        thumbnailUrl: firebaseThumbnailUrl // Use Firebase URL for persistence
      };
      
      addProject(newProject);
      
      // Reset form to allow new videos
      clearPreview();
      
      console.log('🎉 [CLIPPER] Processing started successfully');
      
    } catch (error) {
      console.error('❌ [CLIPPER] Failed to start processing:', error);
      // Show error to user but don't prevent them from trying again
      alert('Failed to start processing. Please try again.');
    } finally {
      setLoadingProcessing(false);
    }
  };

  const simulateProjectProgress = (projectId) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      
      setProjects(prev => prev.map(project => 
        project.id === projectId 
          ? { ...project, progress: Math.min(progress, 100) }
          : project
      ));
      
      setActiveProcessingProjects(prev => prev.map(project => 
        project.id === projectId 
          ? { ...project, progress: Math.min(progress, 100) }
          : project
      ));
      
      if (progress >= 100) {
        clearInterval(interval);
        setProjects(prev => prev.map(project => 
          project.id === projectId 
            ? { ...project, status: "completed", title: "Video Processing Complete" }
            : project
        ));
        
        // Keep ProcessingView but mark as completed
        setActiveProcessingProjects(prev => prev.map(project => 
          project.id === projectId 
            ? { ...project, status: "completed", title: "Video Processing Complete" }
            : project
        ));
      }
    }, 1000);
  };

  const handleProcessingViewClick = (projectId) => {
    const project = activeProjects.find(p => p.id === projectId);
    if (project && project.status === "completed") {
      setShowClipsGallery(true);
    }
  };

  const handleClipSelection = (clipId) => {
    console.log("Selected clip:", clipId);
    // Handle clip selection/preview
  };

  const handleReturnToStudio = () => {
    setShowClipsGallery(false);
  };

  const handleDeleteProject = async (projectId) => {
    try {
      console.log('🗑️ [DELETE] Deleting project:', projectId);
      
      // Check if project exists in local state
      const project = activeProjects.find(p => p.id === projectId);
      if (!project) {
        console.warn('⚠️ [DELETE] Project not found in local state:', projectId);
        return;
      }
      
      // Show deleting status for immediate feedback
      updateProject(projectId, { status: 'deleting' });
      
      try {
        // Try to delete from database
        await deleteProject.mutateAsync(projectId);
        console.log('✅ [DELETE] Project deleted from database');
      } catch (dbError) {
        console.warn('⚠️ [DELETE] Database deletion failed (project may not exist in DB):', dbError.message);
        // Continue with local removal even if DB deletion fails
      }
      
      // Remove from local store
      removeProject(projectId);
      console.log('✅ [DELETE] Project removed from local state');
      
    } catch (error) {
      console.error('❌ [DELETE] Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
      
      // Restore project status if deletion failed
      updateProject(projectId, { status: 'completed' });
    }
  };

  const handleSaveProject = async (projectId) => {
    try {
      console.log('💾 [SAVE] Saving project:', projectId);
      await saveProject.mutateAsync(projectId);
      
      console.log('✅ [SAVE] Project saved successfully');
      // Show success message or update UI
    } catch (error) {
      console.error('❌ [SAVE] Failed to save project:', error);
      alert('Failed to save project. Please try again.');
    }
  };

  const handleLoadSampleProject = () => {
    setUrl("https://www.youtube.com/watch?v=sample");
    setLoadingPreview(true);
    
    setTimeout(() => {
      setHasVideo(true);
      setLoadingPreview(false);
    }, 500);
  };

  // Handle file upload button click
  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*,.mp4,.mov,.avi,.wmv,.flv,.webm,.mkv';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        setUploadedFile(file);
        setLoadingPreview(true);
        
        // Simulate quick processing
        setTimeout(() => {
          setHasVideo(true);
          setLoadingPreview(false);
        }, 500);
      }
    };
    input.click();
  };

  // Show clips gallery if processing is complete
  if (showClipsGallery) {
    return (
      <ClipsGallery
        onClipSelect={handleClipSelection}
        onBack={handleReturnToStudio}
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
              {(isLoadingPreview || isLoadingProcessing) && (
                <div className="absolute inset-0 rounded-lg p-[2px] bg-gradient-to-r from-foreground/5 via-foreground/10 to-foreground/5 dark:from-foreground/10 dark:via-foreground/20 dark:to-foreground/10 animate-spin">
                  <div className="w-full h-full bg-card/80 backdrop-blur-sm rounded-lg"></div>
                </div>
              )}

              {/* Loading Ring Animation */}
              {(isLoadingPreview || isLoadingProcessing) && (
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

              <div {...(!hasVideo ? getRootProps() : {})} className="relative">
                {isDragActive && !hasVideo && (
                  <div className="absolute inset-0 z-50 bg-background border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-primary mx-auto mb-4" />
                      <p className="text-xl font-semibold text-primary">Drop your video or URL here</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Supports video files & YouTube, TikTok, Instagram links
                      </p>
                    </div>
                  </div>
                )}
                <Card
                  className={`relative z-10 bg-card/80 backdrop-blur-sm border-border shadow-2xl p-8 transition-all duration-300 ${
                    (isLoadingPreview || isLoadingProcessing) ? "border-foreground/5 dark:border-foreground/10" : ""
                  }`}
                >
                  {/* Conditional Rendering based on hasVideo state */}
                  {!hasVideo ? (
                    // Initial State: Show input form
                    <form onSubmit={handleVideoUrlSubmit} className="space-y-6">
                    {/* URL Input */}
                    <div className="space-y-4">
                      <div className="relative">
                        <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input
                          type="url"
                          placeholder="Drop a YouTube, TikTok, or podcast link"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          disabled={isLoadingPreview || isLoadingProcessing || isProcessing}
                          className="pl-12 bg-background/50 backdrop-blur-sm border-border text-foreground placeholder-muted-foreground h-12 text-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 disabled:opacity-50"
                        />
                      </div>

                      {/* Upload Options */}
                      <div className="flex gap-4 justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleFileUpload}
                          disabled={isLoadingPreview || isLoadingProcessing}
                          className="border-border text-foreground hover:bg-muted/50 flex items-center gap-2 bg-background/50 backdrop-blur-sm transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                        >
                          <Upload className="w-4 h-4" />
                          Upload or Drop a video
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isLoadingPreview || isLoadingProcessing}
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
                      disabled={(!url.trim() && !uploadedFile) || isLoadingPreview || isLoadingProcessing}
                      className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50"
                    >
                      {isLoadingPreview ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                          Loading...
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
                        onClick={handleLoadSampleProject}
                        disabled={isLoadingPreview || isLoadingProcessing}
                        className="text-muted-foreground hover:text-primary underline text-sm transition-colors duration-200 hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 px-2 py-1 rounded disabled:opacity-50"
                      >
                        Click here to try a sample project
                      </button>
                    </div>
                  </form>
                ) : (
                  // Video Preview State: Show thumbnail and processing options
                  <div className="space-y-6">
                    {/* URL/File Display with Remove Button */}
                    <div className="flex items-center justify-between pl-12 pr-4 py-3 bg-background/50 backdrop-blur-sm border border-border rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm text-muted-foreground truncate">
                          {uploadedFile ? uploadedFile.name : url}
                        </span>
                        {uploadedFile && (
                          <span className="text-xs text-muted-foreground">
                            ({(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB)
                          </span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveVideoUrl}
                        className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-transparent"
                      >
                        Remove
                      </Button>
                    </div>


                    {/* Video Thumbnail */}
                    <div className="relative h-56 rounded-lg overflow-hidden bg-gray-800">
                      {previewThumbnail && !previewThumbnail.includes('placeholder') ? (
                        <img
                          src={previewThumbnail}
                          alt={previewMetadata?.title || "Video thumbnail"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            {uploadedFile ? (
                              <>
                                <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Video File</p>
                                <p className="text-xs opacity-75">{uploadedFile.name}</p>
                              </>
                            ) : (
                              <>
                                <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Preview</p>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Quality Badge */}
                      <div className="absolute top-2 left-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-medium">
                        4K
                      </div>


                      {/* Processing Overlay */}
                      {isLoadingProcessing && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="text-center text-white">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-sm">Analyzing...</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Start Processing Button */}
                    <Button
                      onClick={handleStartVideoProcessing}
                      disabled={isLoadingProcessing}
                      className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50"
                    >
                      {isLoadingProcessing ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                          Starting...
                        </div>
                      ) : (
                        "Start Processing"
                      )}
                    </Button>

                    {/* Copyright Notice */}
                    <p className="text-xs text-muted-foreground text-center leading-relaxed">
                      Using video you don't own may violate copyright laws. By continuing,
                      you confirm this is your own original content.
                    </p>
                  </div>
                )}
              </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Processing Videos at Bottom with Tabs */}
      {activeProjects.length > 0 && (
        <div className="relative z-10 px-4 pb-16">
          <div className="w-full max-w-6xl mx-auto mt-8">
            {/* Tab Headers */}
            <div className="flex gap-8 mb-6">
              <h3 className="text-lg font-semibold text-foreground border-b-2 border-primary pb-1">
                All projects ({activeProjects.length})
              </h3>
              <h3 className="text-lg font-semibold text-muted-foreground pb-1">
                Saved projects (0)
                {/* TODO: Get saved projects count from database using useClipperProjects hook */}
              </h3>
            </div>
            
            {/* Processing Views Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* TODO: Replace with database projects using useClipperProjects hook */}
              {activeProjects.map((project) => (
                <ProcessingView
                  key={project.id}
                  projectId={project.id}
                  videoUrl={project.url}
                  videoTitle={project.title}
                  progress={project.progress}
                  status={project.status}
                  thumbnailUrl={project.thumbnailUrl} // Pass stored Firebase thumbnail URL
                  onClick={() => project.status === 'completed' && handleProcessingViewClick(project.id)}
                  isClickable={project.status === 'completed'}
                  onDelete={handleDeleteProject}
                  onSave={handleSaveProject}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
