"use client";

import { useState, useEffect, useContext } from "react";
import { AlignLeft } from "lucide-react";
import { Textarea } from "@/app/components/ui/textarea";
import { useTextContent } from "@/app/hooks/useMediaQueries";
import { useMediaTextFlow } from "@/app/context/MediaTextFlowContext";

export function TextPost() {
  const { behavior, setBehavior } = useMediaTextFlow();
  const { temporaryText } = behavior;
  const { data: persistedText = "", isLoading } = useTextContent();
  const maxLength = 280;

  const handleTextChange = (e) => {
    const newText = e.target.value;
    if (newText.length <= maxLength) {
      setBehavior((prev) => ({
        ...prev,
        temporaryText: newText,
        isUserTyping: true,
      }));
    }
  };

  if (isLoading) {
    return <div>Loading text...</div>;
  }

  return (
    <div className="w-full space-y-4">
      <h2 className="text-xl font-semibold">Text Post</h2>

      <div className="border rounded-lg p-4 bg-muted/5 min-h-[200px] flex flex-col">
        <Textarea
          placeholder="What's on your mind?"
          className="flex-grow resize-none border-0 focus-visible:ring-0 p-0 text-base bg-transparent text-foreground"
          value={temporaryText}
          onChange={handleTextChange}
          maxLength={maxLength}
          onBlur={() =>
            setBehavior((prev) => ({ ...prev, isUserTyping: false }))
          }
        />

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center text-sm text-muted-foreground">
            <AlignLeft className="h-4 w-4 mr-2" />
            <span>Text post</span>
          </div>

          <div className="text-sm">
            <span
              className={
                temporaryText.length > maxLength * 0.8
                  ? "text-amber-500"
                  : "text-muted-foreground"
              }
            >
              {temporaryText.length}
            </span>
            <span className="text-muted-foreground">/{maxLength}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
