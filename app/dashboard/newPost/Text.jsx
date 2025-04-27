"use client";

import { useState } from "react";
import { AlignLeft } from "lucide-react";
import { Textarea } from "@/app/components/ui/textarea";

export function TextPost({ onTextChange }) {
  const [text, setText] = useState("");
  const maxLength = 280;

  const handleTextChange = (e) => {
    const newText = e.target.value;
    if (newText.length <= maxLength) {
      setText(newText);
      if (onTextChange) {
        const isValid = newText && newText.trim().length > 0;
        onTextChange({ value: newText, isValid: isValid });
      }
    }
  };

  return (
    <div className="w-full space-y-4">
      <h2 className="text-xl font-semibold">Text Post</h2>

      <div className="border rounded-lg p-4 bg-muted/5 min-h-[200px] flex flex-col">
        <Textarea
          placeholder="What's on your mind?"
          className="flex-grow resize-none border-0 focus-visible:ring-0 p-0 text-base bg-transparent"
          value={text}
          onChange={handleTextChange}
        />

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center text-sm text-muted-foreground">
            <AlignLeft className="h-4 w-4 mr-2" />
            <span>Text post</span>
          </div>

          <div className="text-sm">
            <span
              className={
                text.length > maxLength * 0.8
                  ? "text-amber-500"
                  : "text-muted-foreground"
              }
            >
              {text.length}
            </span>
            <span className="text-muted-foreground">/{maxLength}</span>
          </div>
        </div>
      </div>

      {text.length > 0 && (
        <div className="rounded-lg border p-4 bg-card">
          <p className="whitespace-pre-wrap break-words">{text}</p>
        </div>
      )}
    </div>
  );
}
