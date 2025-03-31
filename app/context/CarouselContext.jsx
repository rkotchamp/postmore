"use client";

import { createContext, useContext, useState, useEffect } from "react";

// Create the context
const CarouselContext = createContext(null);

// Custom hook to use the carousel context
export function useCarousel() {
  const context = useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarousel must be used within a CarouselProvider");
  }
  return context;
}

// Provider component
export function CarouselProvider({ children }) {
  // Carousel items state
  const [carouselItems, setCarouselItems] = useState([]);

  // Current active slide/item
  const [activeIndex, setActiveIndex] = useState(0);

  // Stage of progress (0: Content, 1: Accounts, 2: Caption)
  const [progressStage, setProgressStage] = useState(0);

  // Preview visibility flags based on progress stage
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [showAccountsPreview, setShowAccountsPreview] = useState(false);
  const [showCaptionPreview, setShowCaptionPreview] = useState(false);

  // Update preview visibility based on progress stage
  useEffect(() => {
    // Media preview shows at stage 0 (Content) and beyond
    setShowMediaPreview(progressStage >= 0 && carouselItems.length > 0);

    // Accounts preview shows at stage 1 (Accounts) and beyond
    setShowAccountsPreview(progressStage >= 1);

    // Caption preview shows at stage 2 (Caption) and beyond
    setShowCaptionPreview(progressStage >= 2);
  }, [progressStage, carouselItems.length]);

  // Add a new item to the carousel
  const addItem = (item) => {
    setCarouselItems((prev) => [...prev, item]);
  };

  // Remove an item from the carousel
  const removeItem = (index) => {
    setCarouselItems((prev) => prev.filter((_, i) => i !== index));

    // Adjust activeIndex if needed
    if (activeIndex >= index && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  // Update an existing item
  const updateItem = (index, updatedItem) => {
    setCarouselItems((prev) =>
      prev.map((item, i) => (i === index ? updatedItem : item))
    );
  };

  // Reorder carousel items
  const reorderItems = (newOrder) => {
    const reordered = newOrder.map((index) => carouselItems[index]);
    setCarouselItems(reordered);
  };

  // Go to the next item
  const nextItem = () => {
    if (activeIndex < carouselItems.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  };

  // Go to the previous item
  const prevItem = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  // Clear all items
  const clearItems = () => {
    setCarouselItems([]);
    setActiveIndex(0);
  };

  // Set the progress stage directly
  const setStage = (stage) => {
    setProgressStage(stage);
  };

  // Context value
  const value = {
    carouselItems,
    activeIndex,
    progressStage,
    showMediaPreview,
    showAccountsPreview,
    showCaptionPreview,
    addItem,
    removeItem,
    updateItem,
    reorderItems,
    nextItem,
    prevItem,
    clearItems,
    setActiveIndex,
    setStage,
  };

  return (
    <CarouselContext.Provider value={value}>
      {children}
    </CarouselContext.Provider>
  );
}
