"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Image as ImageIcon, FileVideo } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import Image from "next/image";

export function MediaPost({ onMediaChange }) {
  const [media, setMedia] = useState(null);

  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles?.length) {
        const file = acceptedFiles[0];
        const newMedia = {
          file,
          preview: URL.createObjectURL(file),
          type: file.type.startsWith("image/") ? "image" : "video",
        };
        setMedia(newMedia);
        if (onMediaChange) onMediaChange(newMedia);
      }
    },
    [onMediaChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
      "video/*": [],
    },
    maxFiles: 1,
    multiple: false,
  });

  const removeMedia = () => {
    if (media?.preview) {
      URL.revokeObjectURL(media.preview);
    }
    setMedia(null);
    if (onMediaChange) onMediaChange(null);
  };

  return (
    <div className="w-full space-y-4">
      <h2 className="text-xl font-semibold">Media Post</h2>

      {!media ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 transition-all duration-200 flex flex-col items-center justify-center cursor-pointer min-h-[300px] ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
          }`}
        >
          <input {...getInputProps()} />
          <Upload
            className={`h-12 w-12 mb-4 ${
              isDragActive ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <p className="text-center text-muted-foreground mb-2">
            {isDragActive
              ? "Drop your media here"
              : "Drag and drop your image or video here"}
          </p>
          <p className="text-center text-xs text-muted-foreground">
            or click to browse
          </p>
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden bg-muted/20 min-h-[300px] flex items-center justify-center">
          {media.type === "image" ? (
            <Image
              src={media.preview}
              alt="Preview"
              fill
              className="object-contain"
            />
          ) : (
            <video
              src={media.preview}
              className="max-h-[500px] max-w-full"
              controls
            />
          )}
          <Button
            size="icon"
            variant="destructive"
            className="absolute top-2 right-2"
            onClick={removeMedia}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-center text-sm text-muted-foreground">
        {media?.type === "image" ? (
          <>
            <ImageIcon className="h-4 w-4 mr-2" />
            <span>Image: {media.file.name}</span>
          </>
        ) : media?.type === "video" ? (
          <>
            <FileVideo className="h-4 w-4 mr-2" />
            <span>Video: {media.file.name}</span>
          </>
        ) : (
          <span>Supported formats: JPG, PNG, MP4, MOV</span>
        )}
      </div>
    </div>
  );
}
