"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/app/components/ui/card";
import { ImageIcon, Type } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { MediaPosts } from "@/app/dashboard/newPost/MediaPosts";
import { TextPost } from "@/app/dashboard/newPost/Text";
import { useUIStateStore } from "@/app/lib/store/uiStateStore";
// import { useTextContent } from "@/app/hooks/useMediaQueries"; // Removed

export function Content() {
  const postType = useUIStateStore((state) => state.postType);
  const setPostType = useUIStateStore((state) => state.setPostType);
  // const temporaryText = useUIStateStore((state) => state.temporaryText); // Not directly used for this logic anymore
  // const setTemporaryText = useUIStateStore((state) => state.setTemporaryText); // Not directly used for this logic anymore
  // const { data: persistedText, isLoading: isLoadingPersistedText } = useTextContent(); // Removed

  // The useEffect below is removed because uiStateStore now handles persistence
  // of textPostContent directly. Components like TextPost.jsx will consume
  // textPostContent from uiStateStore, which is rehydrated on load.
  /*
  useEffect(() => {
    if (
      postType === "text" &&
      !isLoadingPersistedText &&
      typeof persistedText === "string"
    ) {
      if (temporaryText !== persistedText) {
        console.log(
          "Content: Loading persisted text into UI store temporaryText state:",
          persistedText
        );
        setTemporaryText(persistedText);
      }
    }
  }, [
    postType,
    persistedText,
    isLoadingPersistedText,
    temporaryText,
    setTemporaryText,
  ]);
  */

  const handleTabChange = (newType) => {
    if (newType === "media" || newType === "text") {
      setPostType(newType);
    } else {
      console.warn("Content: Invalid tab type selected", newType);
    }
  };

  return (
    <div className="w-full space-y-4">
      <Card className="border shadow-sm max-w-5xl mx-auto">
        <CardContent className="p-4 md:p-6">
          <Tabs
            value={postType}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6 md:mb-8 bg-muted/60 rounded-lg p-1 h-auto shadow-inner">
              <TabsTrigger
                value="media"
                className="flex items-center justify-center gap-2 py-2.5 md:py-3 text-sm md:text-base data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all duration-200"
              >
                <ImageIcon className="h-4 w-4 md:h-5 md:w-5" />
                <span>Media</span>
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="flex items-center justify-center gap-2 py-2.5 md:py-3 text-sm md:text-base data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all duration-200"
              >
                <Type className="h-4 w-4 md:h-5 md:w-5" />
                <span>Text</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="media"
              forceMount={true}
              className="focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              {postType === "media" && <MediaPosts />}
            </TabsContent>

            <TabsContent
              value="text"
              forceMount={true}
              className="focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              {postType === "text" && <TextPost />}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
