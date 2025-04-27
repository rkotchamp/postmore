"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Plus, Image as ImageIcon, FileVideo } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Image from "next/image";
import { cn } from "@/app/lib/utils";

export function CarouselPost({ onItemsChange }) {
  const [mediaItems, setMediaItems] = useState([]);
  const [isInitial, setIsInitial] = useState(true);
  const [firstItemType, setFirstItemType] = useState(null);

  const MAX_IMAGES = 10;
  const MAX_VIDEOS = 5;

  useEffect(() => {
    if (onItemsChange) {
      const isValid = mediaItems.length > 0;
      onItemsChange({ items: mediaItems, isValid: isValid });
    }
    return () => {
      mediaItems.forEach((item) => {
        if (item.preview && item.preview.startsWith("blob:")) {
        }
      });
    };
  }, [mediaItems]);

  const handleDrop = useCallback(
    (acceptedFiles) => {
      if (!acceptedFiles?.length) return;

      if (isInitial) {
        const firstFile = acceptedFiles[0];
        const isVideo = firstFile.type.startsWith("video/");
        const isImage = firstFile.type.startsWith("image/");

        if (isVideo || isImage) {
          const newItemType = isVideo ? "video" : "image";
          setFirstItemType(newItemType);
          setMediaItems([
            {
              id: Date.now() + Math.random().toString(36).substring(2, 9),
              file: firstFile,
              preview: URL.createObjectURL(firstFile),
              type: newItemType,
            },
          ]);
          setIsInitial(false);
        } else {
          console.warn("Initial file is not a supported image or video type.");
        }
      } else {
        setMediaItems((prevItems) => {
          const currentLimit =
            firstItemType === "video" ? MAX_VIDEOS : MAX_IMAGES;
          const newItems = [...prevItems];

          for (const file of acceptedFiles) {
            if (newItems.length >= currentLimit) {
              console.warn(
                `Limit of ${currentLimit} ${firstItemType}(s) reached.`
              );
              break;
            }

            const isVideo = file.type.startsWith("video/");
            const isImage = file.type.startsWith("image/");
            const currentFileType = isVideo
              ? "video"
              : isImage
              ? "image"
              : null;

            if (currentFileType === firstItemType) {
              newItems.push({
                id: Date.now() + Math.random().toString(36).substring(2, 9),
                file,
                preview: URL.createObjectURL(file),
                type: firstItemType,
              });
            } else if (currentFileType !== null) {
              console.warn(
                `Cannot add ${currentFileType}. Only ${firstItemType}s are allowed.`
              );
            }
          }
          return newItems;
        });
      }
    },
    [isInitial, firstItemType]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: firstItemType === "video" ? { "video/*": [] } : { "image/*": [] },
    multiple: true,
    disabled:
      isInitial ||
      mediaItems.length >=
        (firstItemType === "video" ? MAX_VIDEOS : MAX_IMAGES),
  });

  const {
    getRootProps: getInitialRootProps,
    getInputProps: getInitialInputProps,
    isDragActive: isInitialDragActive,
  } = useDropzone({
    onDrop: handleDrop,
    accept: { "image/*": [], "video/*": [] },
    multiple: false,
  });

  const removeMedia = (id) => {
    setMediaItems((prev) => {
      const removed = prev.find((item) => item.id === id);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  return (
    <div className="w-full space-y-4">
      <h2 className="text-xl font-semibold">Carousel Post</h2>
      <p className="text-sm text-muted-foreground">
        Add up to {MAX_IMAGES} images and {MAX_VIDEOS} videos to create a
        carousel post
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {mediaItems.map((item) => (
          <div
            key={item.id}
            className="relative rounded-lg overflow-hidden bg-muted/20 border min-h-[200px]"
          >
            <Image
              src={item.preview}
              alt={item.file.name}
              fill
              className="object-cover"
            />
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => removeMedia(item.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {mediaItems.length <
          (firstItemType === "video" ? MAX_VIDEOS : MAX_IMAGES) && (
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
            {isDragActive ? (
              <Upload className="h-8 w-8 mb-2 text-primary" />
            ) : (
              <Plus className="h-8 w-8 mb-2 text-muted-foreground" />
            )}
            <p className="text-xs text-center text-muted-foreground">
              {isDragActive ? "Drop here" : "Add image"}
            </p>
          </div>
        )}
      </div>

      {mediaItems.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
          <div className="flex items-center">
            <ImageIcon className="h-4 w-4 mr-2" />
            <span>Carousel: {mediaItems.length} images</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMediaItems([])}
            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
