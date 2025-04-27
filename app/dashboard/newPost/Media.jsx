"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon, FileVideo, Plus } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Image from "next/image";
import { cn } from "@/app/lib/utils";

// Define max images allowed
const MAX_IMAGES = 4;

export function MediaPost({ onMediaChange }) {
  const [mediaItems, setMediaItems] = useState([]);

  const onDrop = useCallback((acceptedFiles) => {
    if (!acceptedFiles?.length) return;

    setMediaItems((prevItems) => {
      const hasVideo = prevItems.some((item) => item.type === "video");
      const hasImage = prevItems.some((item) => item.type === "image");

      // If video already exists, cannot add images
      if (
        hasVideo &&
        acceptedFiles.some((file) => file.type.startsWith("image/"))
      ) {
        console.warn("Cannot add images when a video is present.");
        // Optionally show user-facing error
        return prevItems;
      }

      // If images already exist, cannot add video
      if (
        hasImage &&
        acceptedFiles.some((file) => file.type.startsWith("video/"))
      ) {
        console.warn("Cannot add video when images are present.");
        // Optionally show user-facing error
        return prevItems;
      }

      const newItems = [...prevItems];
      let videoAdded = false;

      for (const file of acceptedFiles) {
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");

        if (isVideo) {
          // Only allow adding a video if the list is currently empty and it's the only file dropped
          if (prevItems.length === 0 && acceptedFiles.length === 1) {
            newItems.push({
              id: Date.now() + Math.random().toString(36).substring(2, 9),
              file,
              preview: URL.createObjectURL(file),
              type: "video",
            });
            videoAdded = true; // Mark that a video was added
            break; // Stop after adding the single video
          } else {
            console.warn(
              "Cannot add video. Only one video allowed, and no other media."
            );
            // Optionally show user-facing error
            return prevItems; // Prevent adding video under wrong conditions
          }
        } else if (isImage) {
          // Can only add images if no video has been added in this batch or previously
          if (!videoAdded && !hasVideo && newItems.length < MAX_IMAGES) {
            newItems.push({
              id: Date.now() + Math.random().toString(36).substring(2, 9),
              file,
              preview: URL.createObjectURL(file),
              type: "image",
            });
          } else if (newItems.length >= MAX_IMAGES) {
            console.warn(`Maximum ${MAX_IMAGES} images allowed.`);
            // Optionally show user-facing error
            // Stop adding images if limit reached, but keep already added ones from this batch
            break;
          }
        }
      }
      return newItems; // Return the potentially modified list
    });
  }, []); // Keep dependency array empty

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
      "video/*": [],
    },
    multiple: true,
  });

  const removeMedia = (idToRemove) => {
    setMediaItems((prevItems) => {
      const itemToRemove = prevItems.find((item) => item.id === idToRemove);
      if (itemToRemove?.preview) {
        URL.revokeObjectURL(itemToRemove.preview);
      }
      // No need to call onMediaChange here, useEffect handles it
      return prevItems.filter((item) => item.id !== idToRemove);
    });
  };

  useEffect(() => {
    if (onMediaChange) {
      const isValid = mediaItems && mediaItems.length > 0;
      onMediaChange({ items: mediaItems, isValid: isValid });
    }
    // Clean up ObjectURLs when component unmounts or mediaItems change
    return () => {
      mediaItems.forEach((item) => {
        if (item.preview && item.preview.startsWith("blob:")) {
          // Check if it looks like an Object URL before revoking
          // This check isn't foolproof but better than nothing
          // URL.revokeObjectURL(item.preview); // Be cautious with cleanup if URLs are needed elsewhere
        }
      });
    };
  }, [mediaItems]); // Trigger effect when mediaItems change

  // Determine current mode
  const currentMode = (() => {
    if (mediaItems.length === 0) return "empty";
    if (mediaItems[0].type === "video") return "singleVideo";
    // Any non-empty state without a video is treated as image grid mode
    return "imageGrid";
  })();

  // Dropzone props for the "Add More" tile (only for imageGrid mode)
  const {
    getRootProps: getAddMoreRootProps,
    getInputProps: getAddMoreInputProps,
    isDragActive: isAddMoreDragActive,
  } = useDropzone({
    onDrop, // Reuse the main onDrop logic
    accept: { "image/*": [] }, // Only accept images
    multiple: true,
    noClick: mediaItems.length >= MAX_IMAGES, // Disable click if max reached
    noKeyboard: mediaItems.length >= MAX_IMAGES,
  });

  return (
    <div className="w-full space-y-4">
      <h2 className="text-xl font-semibold">Media Post</h2>

      {/* Initial Empty Dropzone */}
      {currentMode === "empty" && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg transition-all duration-200 flex flex-col items-center justify-center cursor-pointer min-h-[200px]",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <input {...getInputProps()} />
          <Upload
            className={cn(
              "h-12 w-12 mb-4",
              isDragActive ? "text-primary" : "text-muted-foreground"
            )}
          />
          <p className="text-center text-muted-foreground mb-2">
            {isDragActive
              ? "Drop files here"
              : "Drag and drop image(s) or a video here"}
          </p>
          <p className="text-center text-xs text-muted-foreground">
            (Max {MAX_IMAGES} images or 1 video)
          </p>
        </div>
      )}

      {/* Single Video Preview */}
      {currentMode === "singleVideo" && mediaItems[0] && (
        <div className="relative rounded-lg overflow-hidden bg-muted/20 min-h-[200px] flex items-center justify-center aspect-video">
          <video
            src={mediaItems[0].preview}
            className="max-h-[500px] max-w-full block" // Use block to prevent extra space
            controls
          />
          <Button
            size="icon"
            variant="destructive"
            className="absolute top-2 right-2 z-10 h-7 w-7" // Ensure button is clickable
            onClick={() => removeMedia(mediaItems[0].id)}
            aria-label="Remove video"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Image Grid (Carousel-like) Preview */}
      {currentMode === "imageGrid" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {mediaItems.map((item) => (
            <div
              key={item.id}
              className="relative aspect-square rounded-lg overflow-hidden bg-muted/20 border" // Use aspect-square for consistency
            >
              <Image
                src={item.preview}
                alt={item.file.name || "Uploaded image"} // Provide default alt text
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw" // Optimize image loading
                className="object-cover"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-6 w-6 z-10" // Ensure button is clickable
                onClick={() => removeMedia(item.id)}
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {/* Add More Images Dropzone Tile */}
          {mediaItems.length < MAX_IMAGES && (
            <div
              {...getAddMoreRootProps()}
              className={cn(
                "aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer", // Use aspect-square
                isAddMoreDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                mediaItems.length >= MAX_IMAGES
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              )}
              aria-label="Add more images"
              tabIndex={mediaItems.length >= MAX_IMAGES ? -1 : 0} // Manage focusability
              role="button"
            >
              <input
                {...getAddMoreInputProps()}
                disabled={mediaItems.length >= MAX_IMAGES}
              />
              <Plus
                className={cn(
                  "h-8 w-8 mb-2",
                  isAddMoreDragActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <p className="text-xs text-center text-muted-foreground px-2">
                {isAddMoreDragActive ? "Drop images" : "Add image"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Helper Text */}
      <div className="flex items-center text-sm text-muted-foreground min-h-[20px]">
        {" "}
        {/* Ensure consistent height */}
        {currentMode === "singleVideo" && mediaItems[0] && (
          <>
            <FileVideo className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">Video: {mediaItems[0].file.name}</span>
          </>
        )}
        {currentMode === "imageGrid" && (
          <>
            <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>
              {mediaItems.length} / {MAX_IMAGES} Images Added
            </span>
          </>
        )}
        {/* Optionally show info in empty state as well, or keep it clean */}
        {/* {currentMode === "empty" && (
          <span>
            Supported formats: JPG, PNG, GIF, MP4, MOV (Max {MAX_IMAGES} images or 1 video)
          </span>
        )} */}
      </div>
    </div>
  );
}
