"use client";

import { useState, useEffect, useContext } from "react";
import { Card, CardContent } from "@/app/components/ui/card";
import { ImageIcon, Type, Layers, SendHorizontal } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { MediaPosts } from "@/app/dashboard/newPost/MediaPosts";
import { TextPost } from "@/app/dashboard/newPost/Text";
import { Button } from "@/app/components/ui/button";
import { useMediaTextFlow } from "@/app/context/MediaTextFlowContext";
import { useTextContent } from "@/app/hooks/useMediaQueries";

export function Content() {
  const { behavior, setBehavior } = useMediaTextFlow();
  const {
    postType,
    temporaryText,
    isMediaAvailable: sessionHasMedia,
  } = behavior;
  const { data: persistedText, isLoading: isLoadingPersistedText } =
    useTextContent();

  useEffect(() => {
    if (
      postType === "text" &&
      !isLoadingPersistedText &&
      temporaryText !== persistedText
    ) {
      console.log(
        "Content: Loading persisted text into behavior state:",
        persistedText
      );
      setBehavior((prev) => ({ ...prev, temporaryText: persistedText ?? "" }));
    }
  }, [postType, persistedText, isLoadingPersistedText, setBehavior]);

  const handleTabChange = (newType) => {
    setBehavior((prev) => ({
      ...prev,
      postType: newType,
      temporaryText: newType === "media" ? "" : prev.temporaryText,
      isMediaAvailable: newType === "text" ? false : prev.isMediaAvailable,
      isUserTyping: false,
    }));
  };

  return (
    <div className="w-full space-y-4">
      <Card className="border shadow-sm max-w-5xl mx-auto">
        <CardContent>
          <Tabs
            value={postType}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-white rounded-lg p-1 h-auto shadow-sm">
              <TabsTrigger
                value="media"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                <ImageIcon className="h-4 w-4" />
                <span>Media</span>
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                <Type className="h-4 w-4" />
                <span>Text</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="media">
              {postType === "media" && <MediaPosts />}
            </TabsContent>

            <TabsContent value="text">
              {postType === "text" && <TextPost />}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
