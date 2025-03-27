"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  ImageIcon,
  Type,
  Layers,
  ImagePlus,
  SendHorizontal,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { MediaPost } from "@/app/dashboard/newPost/Media";
import { TextPost } from "@/app/dashboard/newPost/Text";
import { CarouselPost } from "@/app/dashboard/newPost/Carousel";
import { Button } from "@/app/components/ui/button";

export function DashboardContent() {
  const [postType, setPostType] = useState("media");
  const [hasMedia, setHasMedia] = useState(false);
  const [hasText, setHasText] = useState(false);
  const [hasCarouselItems, setHasCarouselItems] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);

  // Check if the post can be submitted based on the current post type and content
  useEffect(() => {
    switch (postType) {
      case "media":
        setCanSubmit(hasMedia);
        break;
      case "text":
        setCanSubmit(hasText);
        break;
      case "carousel":
        setCanSubmit(hasCarouselItems);
        break;
      default:
        setCanSubmit(false);
    }
  }, [postType, hasMedia, hasText, hasCarouselItems]);

  // Handlers for content state updates
  const handleMediaChange = (mediaFile) => {
    setHasMedia(!!mediaFile);
  };

  const handleTextChange = (text) => {
    setHasText(!!text && text.trim().length > 0);
  };

  const handleCarouselChange = (items) => {
    setHasCarouselItems(items && items.length > 0);
  };

  return (
    <div className="w-full max-w-full space-y-4 p-6">
      <h1 className="text-2xl font-bold mb-4 max-w-5xl mx-auto">
        Create New Post
      </h1>

      <Card className="border shadow-sm max-w-5xl mx-auto">
        <CardContent>
          <Tabs
            defaultValue="media"
            value={postType}
            onValueChange={setPostType}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-white rounded-lg p-1 h-auto shadow-sm">
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
              <TabsTrigger
                value="carousel"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                <Layers className="h-4 w-4" />
                <span>Carousel</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="media">
              <MediaPost onMediaChange={handleMediaChange} />
            </TabsContent>

            <TabsContent value="text">
              <TextPost onTextChange={handleTextChange} />
            </TabsContent>

            <TabsContent value="carousel">
              <CarouselPost onItemsChange={handleCarouselChange} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        className="max-w-5xl w-full mx-auto py-6 flex items-center justify-center gap-2 transition-all"
        disabled={!canSubmit}
        variant={canSubmit ? "default" : "secondary"}
      >
        <SendHorizontal className="h-5 w-5" />
        <span className="text-base">Schedule Post</span>
      </Button>
    </div>
  );
}
