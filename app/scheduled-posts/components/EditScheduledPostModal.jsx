"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import { CalendarDays, Clock, X } from "lucide-react";
import { cn } from "@/app/lib/utils";
// import { SelectAccount } from "@/app/dashboard/selectAccount/SelectAccount";
// import { SelectedAccountsPreview } from "@/app/dashboard/selectAccount/SelectedAccountsPreview";
// import { Caption } from "@/app/dashboard/caption/Caption";
// import { ScheduleToggle } from "@/app/dashboard/caption/ScheduleToggle";
import { ImagePreview } from "@/app/components/posts/ImagePreview";
import { VideoPreview } from "@/app/components/posts/VideoPreview";

// Helper function to check if post is editable (>10 minutes before scheduled time)
const isPostEditable = (scheduledTime) => {
  const now = new Date();
  const scheduled = new Date(scheduledTime);
  const timeDiff = scheduled - now;
  return timeDiff > 10 * 60 * 1000; // 10 minutes in milliseconds
};

// Helper function to get time remaining until edit deadline
const getTimeRemaining = (scheduledTime) => {
  const now = new Date();
  const scheduled = new Date(scheduledTime);
  const timeDiff = scheduled - now;
  const editDeadline = timeDiff - 10 * 60 * 1000; // 10 minutes before

  if (editDeadline <= 0) return null;

  const minutes = Math.floor(editDeadline / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
};

export function EditScheduledPostModal({ post, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    caption: "",
    selectedAccounts: [],
    scheduledDate: null,
    isScheduled: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(null);

  // Initialize form data when post changes
  useEffect(() => {
    if (post) {
      setFormData({
        caption: post.caption || "",
        selectedAccounts: post.selectedAccounts || [],
        scheduledDate: post.scheduledDate ? new Date(post.scheduledDate) : null,
        isScheduled: !!post.scheduledDate,
      });

      // Check if post is editable
      const editable = isPostEditable(post.scheduledDate);
      setCanEdit(editable);

      if (editable) {
        setTimeRemaining(getTimeRemaining(post.scheduledDate));
      }
    }
  }, [post]);

  // Update time remaining every minute
  useEffect(() => {
    if (!post || !canEdit) return;

    const interval = setInterval(() => {
      const editable = isPostEditable(post.scheduledDate);
      setCanEdit(editable);

      if (editable) {
        setTimeRemaining(getTimeRemaining(post.scheduledDate));
      } else {
        // Post is no longer editable, close modal
        toast.error(
          "Edit window has expired. Post will be published as scheduled."
        );
        onClose();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [post, canEdit, onClose]);

  const handleSave = async () => {
    if (!canEdit) {
      toast.error("Cannot edit post - too close to scheduled time");
      return;
    }

    setIsLoading(true);

    try {
      // Call the onSave callback with updated data
      await onSave({
        ...post,
        caption: formData.caption,
        selectedAccounts: formData.selectedAccounts,
        scheduledDate: formData.scheduledDate,
      });

      toast.success("Post updated successfully");
      onClose();
    } catch (error) {
      console.error("Error updating post:", error);
      toast.error("Failed to update post. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptionChange = (newCaption) => {
    setFormData((prev) => ({
      ...prev,
      caption: newCaption,
    }));
  };

  const handleAccountsChange = (newAccounts) => {
    setFormData((prev) => ({
      ...prev,
      selectedAccounts: newAccounts,
    }));
  };

  const handleScheduleChange = (scheduledDate, isScheduled) => {
    setFormData((prev) => ({
      ...prev,
      scheduledDate,
      isScheduled,
    }));
  };

  if (!post) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Edit Scheduled Post
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Time Warning */}
          {canEdit && timeRemaining && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  You can edit this post for {timeRemaining} more (until 10
                  minutes before scheduled time)
                </span>
              </div>
            </div>
          )}

          {/* Cannot Edit Warning */}
          {!canEdit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <CalendarDays className="h-4 w-4" />
                <span className="text-sm">
                  This post cannot be edited as it's scheduled within 10
                  minutes. It will be published as originally planned.
                </span>
              </div>
            </div>
          )}

          {/* Media Preview */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Media</h3>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              {post.media ? (
                <div className="w-full max-w-sm mx-auto">
                  {post.mediaType === "video" ? (
                    <VideoPreview media={post.media} />
                  ) : (
                    <ImagePreview media={post.media} />
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No media attached
                </div>
              )}
            </div>
          </div>

          {/* Caption Editor */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Caption</h3>
            <textarea
              value={formData.caption}
              onChange={(e) => handleCaptionChange(e.target.value)}
              disabled={!canEdit}
              className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Write your caption here..."
            />
          </div>

          {/* Account Selection */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">
              Selected Accounts
            </h3>
            <div className="border border-gray-200 rounded-lg p-4">
              {formData.selectedAccounts.length > 0 ? (
                <div className="space-y-2">
                  {formData.selectedAccounts.map((account, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {account.platform}
                        </span>
                        <span className="text-sm text-gray-600">
                          {account.username}
                        </span>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => {
                            const newAccounts =
                              formData.selectedAccounts.filter(
                                (_, i) => i !== index
                              );
                            handleAccountsChange(newAccounts);
                          }}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No accounts selected</p>
              )}
            </div>
          </div>

          {/* Schedule Settings */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Schedule</h3>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Schedule for later
                  </label>
                  <input
                    type="checkbox"
                    checked={formData.isScheduled}
                    onChange={(e) =>
                      handleScheduleChange(
                        e.target.checked
                          ? new Date(Date.now() + 11 * 60 * 1000)
                          : null,
                        e.target.checked
                      )
                    }
                    disabled={!canEdit}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />
                </div>

                {formData.isScheduled && formData.scheduledDate && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Scheduled Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.scheduledDate.toISOString().slice(0, 16)}
                      onChange={(e) =>
                        handleScheduleChange(new Date(e.target.value), true)
                      }
                      disabled={!canEdit}
                      min={new Date(Date.now() + 11 * 60 * 1000)
                        .toISOString()
                        .slice(0, 16)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canEdit || isLoading}
            className={cn("min-w-[100px]", isLoading && "cursor-not-allowed")}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
