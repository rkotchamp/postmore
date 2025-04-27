"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/app/components/ui/card";
import { ImageIcon, Type } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { MediaPost } from "@/app/dashboard/newPost/Media";
import { TextPost } from "@/app/dashboard/newPost/Text";
import { Button } from "@/app/components/ui/button";

export function Content({ onContentChange }) {
  const [postType, setPostType] = useState("media");
  const [latestData, setLatestData] = useState(null);

  const handleMediaChange = (mediaData) => {
    setLatestData({ type: "media", ...mediaData });
  };

  const handleTextChange = (textData) => {
    setLatestData({ type: "text", ...textData });
  };

  useEffect(() => {
    if (latestData === null || !onContentChange) {
      return;
    }

    let contentObject;
    if (latestData.type === "media") {
      contentObject = {
        type: "media",
        isValid: latestData.isValid || false,
        data: { mediaItems: latestData.items || [] },
      };
    } else if (latestData.type === "text") {
      contentObject = {
        type: "text",
        isValid: latestData.isValid || false,
        data: { text: latestData.value || "" },
      };
    } else {
      contentObject = { type: null, isValid: false, data: null };
    }

    onContentChange(contentObject);
  }, [latestData, onContentChange]);

  useEffect(() => {
    setLatestData(null);
  }, [postType]);

  return (
    <div className="w-full space-y-4">
      <Card className="border shadow-sm max-w-5xl mx-auto">
        <CardContent>
          <Tabs
            defaultValue="media"
            value={postType}
            onValueChange={setPostType}
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
              <MediaPost onMediaChange={handleMediaChange} />
            </TabsContent>

            <TabsContent value="text">
              <TextPost onTextChange={handleTextChange} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Submit Button */}
      {/* <Button
        className="max-w-5xl w-full mx-auto py-6 flex items-center justify-center gap-2 transition-all"
        disabled={!canSubmit}
        variant={canSubmit ? "default" : "secondary"}
      >
        <SendHorizontal className="h-5 w-5" />
        <span className="text-base">Schedule Post</span>
      </Button> */}
    </div>
  );
}
