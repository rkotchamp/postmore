import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function DisconnectDialog({
  isOpen,
  onClose,
  onConfirm,
  platform,
  accountName,
  isLoading,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Disconnect {platform} Account
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to disconnect the {platform} account{" "}
            <span className="font-medium text-foreground">{accountName}</span>?
            This will remove access to this account from PostMore.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Disconnecting..." : "Yes, Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
