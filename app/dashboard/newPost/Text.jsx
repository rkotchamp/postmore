"use client";

import { useEffect, useState } from "react";
import { AlignLeft } from "lucide-react";
import { Textarea } from "@/app/components/ui/textarea";
import { useUIStateStore } from "@/app/lib/store/uiStateStore";
import { Card, CardContent } from "@/app/components/ui/card";

export function TextPost() {
  const textPostContent = useUIStateStore((state) => state.textPostContent);
  const setTextPostContent = useUIStateStore(
    (state) => state.setTextPostContent
  );
  const [isUserTyping, setIsUserTyping] = useState(false);

  const maxLength = 5000;

  const handleTextChange = (e) => {
    const newText = e.target.value;
    if (newText.length <= maxLength) {
      setTextPostContent(newText);
      if (!isUserTyping) {
        setIsUserTyping(true);
      }
    }
  };

  const handleBlur = () => {
    setIsUserTyping(false);
  };

  return (
    <div className="w-full space-y-4">
      <h2 className="text-xl font-semibold">Text Post</h2>

      <Card className="border shadow-sm bg-muted/5">
        <CardContent className="p-4 flex flex-col min-h-[200px]">
          <Textarea
            placeholder="What's on your mind?"
            className="flex-grow resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-base bg-transparent text-foreground placeholder:text-muted-foreground/50"
            value={textPostContent}
            onChange={handleTextChange}
            onBlur={handleBlur}
            aria-label="Text post content"
          />

          <div className="flex items-center justify-between mt-auto pt-4 border-t border-muted-foreground/10">
            <div className="flex items-center text-sm text-muted-foreground">
              <AlignLeft className="h-4 w-4 mr-2" />
              <span>Text post</span>
            </div>

            <div className="text-sm font-mono">
              <span
                className={
                  textPostContent.length > maxLength * 0.9
                    ? "text-orange-500"
                    : textPostContent.length > maxLength * 0.7
                    ? "text-yellow-500"
                    : "text-muted-foreground/80"
                }
              >
                {textPostContent.length}
              </span>
              <span className="text-muted-foreground/50"> / {maxLength}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
