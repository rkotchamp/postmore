import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

export function DeletePostDialog({
  isOpen,
  onClose,
  onConfirm,
  post,
  isLoading = false,
}) {
  const handleConfirm = () => {
    onConfirm(post);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex gap-2 items-center text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Post
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this post? This action cannot be
            undone.
          </AlertDialogDescription>
          {post?.scheduledDate && (
            <div className="mt-2 text-sm text-muted-foreground">
              <strong>Scheduled for:</strong> {post.scheduledDate} at{" "}
              {post.scheduledTime}
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
