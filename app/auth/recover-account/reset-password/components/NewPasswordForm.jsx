"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/app/components/ui/form";
import {
  Lock,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { newPasswordSchema } from "@/app/models/ZodFormSchemas";
import { Suspense } from "react";

function NewPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetCode = searchParams.get("code");
  const email = searchParams.get("email");

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const handlePasswordResetSubmit = async (values) => {
    setIsLoading(true);

    try {
      // Log the parameters for debugging
      console.log("Reset parameters:", {
        code: resetCode,
        email: email,
        password: "********", // Don't log the actual password
      });

      if (!resetCode) {
        throw new Error("Invalid or expired reset code");
      }

      // Make API call to the password reset endpoint
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: resetCode,
          email: email,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Password reset failed");
      }

      setIsSuccessful(true);

      toast.success("Password changed successfully", {
        description: "Your password has been updated.",
      });
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("Failed to update password", {
        description: error.message || "Please try again or request a new link.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  if (isSuccessful) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="rounded-full bg-primary/10 p-4">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Password updated</h3>
            <p className="text-muted-foreground">
              Your password has been reset successfully.
              {email && (
                <span className="block font-medium text-foreground">
                  You can now login with your new password.
                </span>
              )}
            </p>
          </div>
        </div>

        <Button className="w-full" onClick={() => router.push("/auth/login")}>
          Back to login
        </Button>
      </div>
    );
  }

  // If no reset code is provided, show an error message
  if (!resetCode) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <Lock className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Invalid reset link</h3>
            <p className="text-muted-foreground">
              This password reset link is invalid or has expired.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full flex items-center gap-2"
          onClick={() => router.push("/auth/reset-password")}
        >
          <ArrowLeft className="h-4 w-4" />
          Request a new reset link
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handlePasswordResetSubmit)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Enter your new password below. Choose a strong password that's at
              least 8 characters with a mix of letters, numbers, and symbols.
            </p>
          </div>

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      className="pl-9 pr-9"
                      {...field}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-primary transition-colors"
                      onClick={togglePasswordVisibility}
                      tabIndex="-1"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="••••••••"
                      type={showConfirmPassword ? "text" : "password"}
                      className="pl-9 pr-9"
                      {...field}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-primary transition-colors"
                      onClick={toggleConfirmPasswordVisibility}
                      tabIndex="-1"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating password...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}

function NewPasswordFormFallback() {
  return (
    <div className="grid gap-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Loading password reset form...
        </p>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  );
}

export function NewPasswordForm() {
  return (
    <Suspense fallback={<NewPasswordFormFallback />}>
      <NewPasswordFormContent />
    </Suspense>
  );
}
