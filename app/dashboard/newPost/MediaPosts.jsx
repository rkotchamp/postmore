"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  X,
  Image as ImageIcon,
  FileVideo,
  Plus,
  AlertCircle,
  FileImage,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Image from "next/image";
import { cn } from "@/app/lib/utils";
import { useMediaItems, QUERY_KEYS } from "@/app/hooks/useMediaQueries";
import { useMediaMutations } from "@/app/hooks/useMediaMutations";
import { useQueryClient } from "@tanstack/react-query";
import { MediaPlayer } from "@/app/dashboard/VideoPlayer/MediaPlayer";

// Maximum number of images allowed
const MAX_IMAGES = 10;

export function MediaPosts() {
  // State for Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // State for temporary, session-only preview URLs
  const [localPreviews, setLocalPreviews] = useState({}); // { [itemId]: blobUrl }

  // State to track client-side mount
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // --- TanStack Query Hooks ---
  const queryClient = useQueryClient(); // Get query client instance
  const { data: mediaItems = [], isLoading: isLoadingMedia } = useMediaItems();
  const { updateMedia, clearMedia } = useMediaMutations();
  // --- End TanStack Query Hooks ---

  // Ref to keep track of current media items for cleanup
  const mediaItemsRef = useRef(mediaItems);
  useEffect(() => {
    mediaItemsRef.current = mediaItems;
  }, [mediaItems]);

  // Effect for managing local blob URLs
  useEffect(() => {
    const currentLocalPreviews = { ...localPreviews };
    let previewsChanged = false;

    Object.keys(currentLocalPreviews).forEach((itemId) => {
      if (!mediaItemsRef.current.some((item) => item.id === itemId)) {
        console.log(`Cleaning up stale local preview for ${itemId}`);
        if (currentLocalPreviews[itemId]?.startsWith("blob:")) {
          URL.revokeObjectURL(currentLocalPreviews[itemId]);
        }
        delete currentLocalPreviews[itemId];
        previewsChanged = true;
      }
    });

    if (previewsChanged) {
      setLocalPreviews(currentLocalPreviews);
    }

    return () => {
      Object.values(localPreviews).forEach((url) => {
        if (url?.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [mediaItems]);

  // Derive mode directly from TanStack Query mediaItems state
  const mode =
    !mediaItems || mediaItems.length === 0
      ? "empty"
      : mediaItems[0].type === "video"
      ? "singleVideo"
      : "multiImage";

  // Determine if the dropzone should be disabled
  const shouldDisableDropzone =
    mode === "singleVideo" ||
    (mode === "multiImage" && mediaItems.length >= MAX_IMAGES);

  const onDrop = useCallback(
    (acceptedFiles) => {
      // Use query cache data as the source of truth for current items
      const currentItems = queryClient.getQueryData([QUERY_KEYS.media]) || [];
      const currentMode =
        currentItems.length === 0
          ? "empty"
          : currentItems[0].type === "video"
          ? "singleVideo"
          : "multiImage";

      if (
        currentMode === "singleVideo" ||
        (currentMode === "multiImage" && currentItems.length >= MAX_IMAGES)
      ) {
        setModalMessage(
          currentMode === "singleVideo"
            ? "Oops! A post can only contain one video or multiple images, not both."
            : `Oops! You can add a maximum of ${MAX_IMAGES} images.`
        );
        setIsModalOpen(true);
        return;
      }

      let filesToAdd = [];
      let videoAddedInThisDrop = false;

      for (const file of acceptedFiles) {
        const fileType = file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
          ? "video"
          : null;

        if (!fileType) continue;

        if (fileType === "video") {
          if (currentItems.length === 0) {
            filesToAdd = [
              {
                id: Date.now() + Math.random().toString(36).substring(2, 9),
                file,
                type: fileType,
                fileInfo: {
                  name: file.name,
                  type: file.type,
                  size: file.size,
                },
              },
            ];
            videoAddedInThisDrop = true;
            break; // Only one video allowed
          } else {
            setModalMessage(
              "Oops! You can't add a video once images are selected."
            );
            setIsModalOpen(true);
            continue;
          }
        }

        if (fileType === "image") {
          if (videoAddedInThisDrop) continue;

          if (currentItems.length + filesToAdd.length < MAX_IMAGES) {
            filesToAdd.push({
              id: Date.now() + Math.random().toString(36).substring(2, 9),
              file,
              type: fileType,
              fileInfo: {
                name: file.name,
                type: file.type,
                size: file.size,
              },
            });
          } else {
            setModalMessage(
              `Oops! You can add a maximum of ${MAX_IMAGES} images.`
            );
            setIsModalOpen(true);
            break;
          }
        }
      }

      if (filesToAdd.length > 0) {
        const newPreviews = { ...localPreviews };
        filesToAdd.forEach((item) => {
          newPreviews[item.id] = URL.createObjectURL(item.file);
        });
        setLocalPreviews(newPreviews);

        // Prepare the full new list for the mutation by combining with current items
        // Ensure 'filesToAdd' (which contains the File objects) is used directly
        const combinedNewItems = [...currentItems, ...filesToAdd];

        updateMedia.mutate(combinedNewItems, {
          onSuccess: (updatedItems) => {
            console.log("Media mutation successful");
          },
          onError: (error) => {
            console.error("Error updating media:", error);
            // Revert local previews if mutation fails
            setLocalPreviews((prev) => {
              const next = { ...prev };
              filesToAdd.forEach((item) => {
                if (next[item.id]?.startsWith("blob:")) {
                  URL.revokeObjectURL(next[item.id]);
                }
                delete next[item.id];
              });
              return next;
            });
            setModalMessage("Failed to add media. Please try again.");
            setIsModalOpen(true);
          },
        });
      }
    },
    [queryClient, localPreviews, updateMedia, MAX_IMAGES]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "image/gif": [],
      "video/mp4": [],
      "video/quicktime": [], // .mov
    },
    multiple: true,
    disabled: shouldDisableDropzone || updateMedia.isLoading,
  });

  const handleRemoveMedia = (idToRemove) => {
    if (localPreviews[idToRemove]?.startsWith("blob:")) {
      URL.revokeObjectURL(localPreviews[idToRemove]);
      setLocalPreviews((prev) => {
        const next = { ...prev };
        delete next[idToRemove];
        return next;
      });
    }

    // Get current items from cache
    const currentItems = queryClient.getQueryData([QUERY_KEYS.media]) || [];
    const updatedItems = currentItems.filter((item) => item.id !== idToRemove);

    updateMedia.mutate(updatedItems, {
      onSuccess: (updatedItemsResult) => {
        console.log("Remove media mutation successful");
      },
      onError: (error) => {
        console.error("Error removing media:", error);
        setModalMessage("Failed to remove media. Please try again.");
        setIsModalOpen(true);
      },
    });
  };

  const handleClearAllMedia = () => {
    Object.values(localPreviews).forEach((url) => {
      if (url?.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });
    setLocalPreviews({});
    console.log(
      "[handleClearAllMedia] Clearing media and resetting carousel state"
    );
    clearMedia.mutate(undefined, {
      onSuccess: () => {
        console.log("Cleared all media successfully.");
      },
      onError: (error) => {
        console.error("Error clearing media:", error);
        setModalMessage("Failed to clear media. Please try again.");
        setIsModalOpen(true);
      },
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalMessage("");
  };

  // Handle loading state
  if (isLoadingMedia) {
    return <div>Loading media...</div>; // Or a spinner component
  }

  // Render logic
  return (
    <div className="w-full space-y-4">
      <h2 className="text-xl font-semibold">Media Post</h2>

      {/* Initial Large Dropzone - Render only if mode is 'empty' */}
      {mode === "empty" && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg transition-all duration-200 flex flex-col items-center justify-center cursor-pointer min-h-[200px]",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            shouldDisableDropzone && "cursor-not-allowed opacity-50"
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
            Drag and drop video or up to {MAX_IMAGES} images
          </p>
          <p className="text-center text-xs text-muted-foreground">
            or click to browse
          </p>
        </div>
      )}

      {/* Grid Layout - Render if mode is 'singleVideo' or 'multiImage' */}
      {(mode === "singleVideo" || mode === "multiImage") && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {/* Render Media Tiles (Video or Images) */}
          {mediaItems.map((item) => {
            const previewUrl = localPreviews[item.id];
            return (
              <div
                key={item.id}
                className="relative rounded-lg overflow-hidden bg-muted/20 border min-h-[200px] flex items-center justify-center text-muted-foreground"
              >
                {item.type === "video" ? (
                  previewUrl ? (
                    <MediaPlayer
                      file={item.file}
                      type="video"
                      id={item.id}
                      controls
                    />
                  ) : (
                    <div className="text-center p-2">
                      <FileVideo className="h-10 w-10 mx-auto mb-2" />
                      <span className="text-xs break-all">
                        {item.fileInfo?.name || "Video file"}
                      </span>
                    </div>
                  )
                ) : previewUrl ? (
                  <MediaPlayer file={item.file} type="image" id={item.id} />
                ) : (
                  <div className="text-center p-2">
                    <FileImage className="h-10 w-10 mx-auto mb-2" />
                    <span className="text-xs break-all">
                      {item.fileInfo?.name || "Image file"}
                    </span>
                  </div>
                )}
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-6 w-6 z-10"
                  onClick={() => handleRemoveMedia(item.id)}
                  disabled={updateMedia.isLoading || clearMedia.isLoading}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}

          {/* Add more images dropzone tile */}
          {mode === "multiImage" && !shouldDisableDropzone && (
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer min-h-[200px]",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <input {...getInputProps()} />
              <Plus
                className={cn(
                  "h-8 w-8",
                  isDragActive ? "text-primary" : "text-muted-foreground"
                )}
              />
            </div>
          )}
        </div>
      )}

      {/* Footer Helper Text */}
      <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
        <div className="flex items-center">
          {mode === "empty" ? null : mode === "singleVideo" ? (
            <FileVideo className="h-4 w-4 mr-2" />
          ) : (
            <ImageIcon className="h-4 w-4 mr-2" />
          )}
          <span>
            {mode === "empty"
              ? "Supported formats: JPG, PNG, WEBP, GIF, MP4, MOV"
              : mode === "singleVideo"
              ? `Video: ${mediaItems[0]?.fileInfo?.name || "video file"}`
              : `Images: ${mediaItems.length} / ${MAX_IMAGES}`}
          </span>
        </div>
        {mode !== "empty" && mediaItems.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAllMedia}
            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
            disabled={clearMedia.isLoading || updateMedia.isLoading}
          >
            Clear all
          </Button>
        )}
      </div>

      {/* DaisyUI Modal for Errors */}
      <dialog
        id="media_error_modal"
        className="modal modal-bottom sm:modal-middle"
        open={isModalOpen}
      >
        <div className="modal-box">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-6 w-6 text-warning" />
            <h3 className="font-bold text-lg text-warning">Oops!🙊</h3>
          </div>
          <p className="py-1 text-white">{modalMessage}</p>
          <div className="modal-action mt-4">
            <Button onClick={handleCloseModal} variant="outline">
              Close
            </Button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={handleCloseModal}>close</button>
        </form>
      </dialog>
    </div>
  );
}
