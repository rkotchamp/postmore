"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import Spinner from "@/app/components/ui/Spinner"; // Import the spinner

export function BlueskyLoginModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  error,
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isLoading) {
      onSubmit({ identifier, password });
    }
  };

  // Handle changes in isOpen prop to reset fields if needed
  useState(() => {
    if (!isOpen) {
      setIdentifier("");
      setPassword("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect Bluesky Account</DialogTitle>
          <DialogDescription>
            Enter your Bluesky handle (e.g., username.bsky.social) and an App
            Password.
            <a
              href="https://bsky.app/settings/app-passwords"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Generate an App Password here.
            </a>
            Never use your main password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bsky-identifier" className="text-right">
                Handle/Email
              </Label>
              <Input
                id="bsky-identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="col-span-3"
                required
                disabled={isLoading}
                placeholder="yourname.bsky.social"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bsky-password" className="text-right">
                App Password
              </Label>
              <Input
                id="bsky-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="col-span-3"
                required
                disabled={isLoading}
                placeholder="xxxx-xxxx-xxxx-xxxx"
              />
            </div>
            {error && (
              <div className="col-span-4">
                <p className="text-sm text-red-500 text-center bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
