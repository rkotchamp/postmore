"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * ImagePreview component for displaying image content in posts
 *
 * @param {Object} props
 * @param {Array|string} props.images - Single image URL or array of image URLs
 */
export const ImagePreview = ({ images }) => {
  // Convert to array if single string is provided
  const imageArray = Array.isArray(images) ? images : [images];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  // No need for carousel controls if only one image
  const showControls = imageArray.length > 1;

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % imageArray.length);
  };

  const goToPrevious = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + imageArray.length) % imageArray.length
    );
  };

  return (
    <div
      className="w-full h-full relative rounded-t-lg overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Current image */}
      <div className="w-full h-full bg-muted">
        {imageArray[currentIndex] ? (
          <div className="relative w-full h-full">
            <Image
              src={imageArray[currentIndex]}
              alt={`Image ${currentIndex + 1}`}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-muted-foreground">Image not available</p>
          </div>
        )}
      </div>

      {/* Navigation arrows - only show when hovering and multiple images */}
      {showControls && (isHovering || true) && (
        <>
          {/* Left arrow */}
          <button
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 p-1 rounded-full"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>

          {/* Right arrow */}
          <button
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 p-1 rounded-full"
            onClick={goToNext}
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        </>
      )}

      {/* Dots indicator - only show for multiple images */}
      {showControls && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1">
          {imageArray.map((_, index) => (
            <button
              key={index}
              className={`h-2 w-2 rounded-full ${
                index === currentIndex ? "bg-white" : "bg-white/50"
              }`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImagePreview;
