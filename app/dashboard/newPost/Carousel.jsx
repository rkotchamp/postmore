"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Plus, Image as ImageIcon } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Image from "next/image";
import { cn } from "@/app/lib/utils";

export function CarouselPost({ onItemsChange }) {
  const [mediaItems, setMediaItems] = useState([]);
  const maxItems = 10;

  // Update parent when mediaItems change
  useEffect(() => {
    if (onItemsChange) {
      onItemsChange(mediaItems);
    }
  }, [mediaItems, onItemsChange]);

  const onDrop = useCallback((acceptedFiles) => {
    setMediaItems((prev) => {
      const newItems = [...prev];

      acceptedFiles.forEach((file) => {
        if (newItems.length < maxItems) {
          newItems.push({
            id: Date.now() + Math.random().toString(36).substring(2, 9),
            file,
            preview: URL.createObjectURL(file),
          });
        }
      });

      return newItems;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    maxFiles: maxItems,
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
        Add up to {maxItems} images to create a carousel post
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {mediaItems.map((item) => (
          <div
            key={item.id}
            className="relative aspect-square rounded-lg overflow-hidden bg-muted/20 border"
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

        {mediaItems.length < maxItems && (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer",
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
