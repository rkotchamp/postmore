"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";

export function PostSuccessModal({ 
  isOpen, 
  onClose, 
  onSeePost, 
  onDone,
  postType, // "scheduled" or "immediate"
  scheduledAt 
}) {
  const isScheduled = postType === "scheduled";
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-lg">
            Post {isScheduled ? "Scheduled" : "Published"} Successfully!
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isScheduled 
              ? `Your post will be published at ${new Date(scheduledAt).toLocaleString()}`
              : "Your post has been published to the selected platforms."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-6">
          <Button 
            onClick={onSeePost}
            className="w-full"
          >
            See Post
          </Button>
          <Button 
            variant="outline" 
            onClick={onDone}
            className="w-full"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}