"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { recoverAccountSchema } from "@/app/models/ZodFormSchemas";

export function ResetPasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm({
    resolver: zodResolver(recoverAccountSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleResetRequest = async (values) => {
    setIsLoading(true);

    try {
      // Make API call to request password reset
      const response = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          toast.error(data.message, {
            description: "Please check your email and try again.",
          })
        );
      }

      setIsSubmitted(true);

      // Always show a neutrally-worded success message that doesn't confirm or deny
      // the existence of the account for security reasons
      toast.success("Request processed", {
        description:
          "If your email is registered, you'll receive a reset link shortly. Please check your inbox and spam folder.",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("Failed to send reset link", {
        description:
          error.message || "Please try again later or contact support.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="rounded-full bg-primary/10 p-4">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Request Submitted</h3>
            <p className="text-muted-foreground">
              If{" "}
              <span className="block font-medium text-foreground">
                {form.getValues("email")}
              </span>{" "}
              is registered, we've sent a password reset link.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-center text-muted-foreground">
            Please check both your inbox and spam folder. If you don't receive
            an email within a few minutes, you can request another link or try a
            different email.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsSubmitted(false)}
          >
            Try Again
          </Button>
          <Button
            variant="link"
            className="w-full flex items-center gap-2"
            onClick={() => router.push("/auth/login")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleResetRequest)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Enter your email address and we'll send you a link to reset your
              password.
            </p>
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="email@example.com"
                      type="email"
                      className="pl-9"
                      {...field}
                      disabled={isLoading}
                    />
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
                Sending reset link...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      </Form>

      <Button
        variant="outline"
        className="w-full flex items-center gap-2"
        onClick={() => router.push("/auth/login")}
        disabled={isLoading}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </Button>
    </div>
  );
}
