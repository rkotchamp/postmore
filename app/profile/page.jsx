"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@/app/context/UserContext";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/app/dashboard/components/dashboard-layout";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import {
  Edit,
  Camera,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import useFirebaseStorage from "@/app/hooks/useFirebaseStorage";
import Spinner from "@/app/components/ui/Spinner";
import { Skeleton } from "@/app/components/ui/skeleton";

// Profile page skeleton component
const ProfileSkeleton = () => {
  return (
    <>
      {/* Title */}
      <Skeleton className="h-9 w-48" />

      {/* Profile Picture Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="absolute bottom-0 right-0">
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Name Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-24" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-10 w-10" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Section Skeleton */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-36" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>

      {/* Account Information Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default function Profile() {
  const { user, isLoading: isLoadingUser, refetch: refetchUser } = useUser();
  const { uploadProfilePicture, isUploading } = useFirebaseStorage();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  // Form states
  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isEditingName, setIsEditingName] = useState(false);
  const [imageUpdateKey, setImageUpdateKey] = useState(0);

  // Set initial name when user data loads
  useEffect(() => {
    if (user?.name && !name) {
      setName(user.name);
    }
  }, [user?.name, name]);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file" });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image size must be less than 5MB" });
      return;
    }

    try {
      setMessage({ type: "", text: "" });

      // Upload to Firebase
      const result = await uploadProfilePicture(file, user.id);
      console.log("Firebase upload result:", result);

      // Update user profile with new image URL
      await updateProfile({ image: result.url });

      // Force re-render of the avatar
      setImageUpdateKey((prev) => prev + 1);

      setMessage({
        type: "success",
        text: "Profile picture updated successfully!",
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      setMessage({ type: "error", text: "Failed to upload profile picture" });
    }
  };

  const handleNameUpdate = async () => {
    if (!name.trim()) {
      setMessage({ type: "error", text: "Name cannot be empty" });
      return;
    }

    if (name.trim() === user?.name) {
      setIsEditingName(false);
      return;
    }

    try {
      await updateProfile({ name: name.trim() });
      setIsEditingName(false);
      setMessage({ type: "success", text: "Name updated successfully!" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update name" });
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      setMessage({ type: "error", text: "Please fill in all password fields" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({
        type: "error",
        text: "New password must be at least 8 characters long",
      });
      return;
    }

    try {
      await updateProfile({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Password updated successfully!" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Failed to update password",
      });
    }
  };

  const updateProfile = async (data) => {
    setIsUpdating(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log("Profile update result:", result);

      if (!response.ok) {
        throw new Error(result.error || "Failed to update profile");
      }

      // Clear all queries related to user profile
      await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      await queryClient.refetchQueries({ queryKey: ["userProfile"] });

      // Also trigger a direct refetch to ensure immediate update
      await refetchUser();

      // Force a state update to trigger re-render
      setName(result.user?.name || name);

      return result;
    } catch (error) {
      console.error("Error in updateProfile:", error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoadingUser) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <ProfileSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">Profile Settings</h1>

        {/* Status Messages */}
        {message.text && (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            {message.type === "error" ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Profile Picture Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage
                  src={user?.image || ""}
                  alt={user?.name || "User"}
                  key={`${user?.image}-${imageUpdateKey}`} // Force re-render when image changes
                  className="object-cover"
                />
                <AvatarFallback className="text-2xl">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                size="icon"
                className="absolute bottom-0 right-0 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {/* Debug info - remove in production */}
            <div className="text-xs text-muted-foreground">
              Current image: {user?.image ? "✓" : "✗"} | Source: {user?.source}
            </div>
          </CardContent>
        </Card>

        {/* Name Section */}
        <Card>
          <CardHeader>
            <CardTitle>Full Name</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditingName || isUpdating}
                  className={!isEditingName ? "cursor-default" : ""}
                />
              </div>
              <div className="flex space-x-2">
                {!isEditingName ? (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsEditingName(true)}
                    disabled={isUpdating}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setName(user?.name || "");
                        setIsEditingName(false);
                      }}
                      disabled={isUpdating}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleNameUpdate} disabled={isUpdating}>
                      {isUpdating ? <Spinner className="h-4 w-4" /> : "Save"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Section - Only show for non-OAuth users */}
        {user?.authProvider === "credentials" && (
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isUpdating}
                    placeholder="Enter your current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isUpdating}
                    placeholder="Enter your new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isUpdating}
                    placeholder="Confirm your new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                onClick={handlePasswordChange}
                disabled={
                  isUpdating ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
                className="w-full"
              >
                {isUpdating ? <Spinner className="h-4 w-4 mr-2" /> : null}
                Update Password
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                value={user?.email || ""}
                disabled
                className="cursor-not-allowed opacity-60"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed
              </p>
            </div>
            <div>
              <Label>Account Type</Label>
              <Input
                value={
                  user?.authProvider === "credentials"
                    ? "Email & Password"
                    : `${user?.authProvider} OAuth`
                }
                disabled
                className="cursor-not-allowed opacity-60"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
