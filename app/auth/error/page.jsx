"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = () => {
    switch (error) {
      case "AccessDenied":
        return "Access denied. There was a problem authenticating your account.";
      case "Configuration":
        return "There is a problem with the server configuration. Please contact support.";
      case "Verification":
        return "The verification link may have expired or already been used.";
      case "OAuthSignin":
        return "Could not initiate OAuth sign-in. Please try again.";
      case "OAuthCallback":
        return "There was a problem with the OAuth callback. Please try again.";
      default:
        return "An unexpected authentication error occurred. Please try again.";
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
      <div className="flex items-center justify-center space-x-2 text-red-500">
        <AlertCircle className="w-8 h-8" />
        <h1 className="text-2xl font-bold">Authentication Error</h1>
      </div>

      <div className="p-4 border rounded-md bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
        <p className="text-center text-red-700 dark:text-red-300">
          {getErrorMessage()}
        </p>
      </div>

      <div className="flex flex-col space-y-4">
        <Button asChild className="w-full">
          <Link href="/auth/login">Try Again</Link>
        </Button>

        <Button asChild variant="outline" className="w-full">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
}

function ErrorFallback() {
  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
      <div className="flex items-center justify-center space-x-2 text-red-500">
        <AlertCircle className="w-8 h-8" />
        <h1 className="text-2xl font-bold">Authentication Error</h1>
      </div>

      <div className="p-4 border rounded-md bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
        <p className="text-center text-red-700 dark:text-red-300">
          Loading error details...
        </p>
      </div>

      <div className="flex flex-col space-y-4">
        <Button asChild className="w-full">
          <Link href="/auth/login">Try Again</Link>
        </Button>

        <Button asChild variant="outline" className="w-full">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <Suspense fallback={<ErrorFallback />}>
        <ErrorContent />
      </Suspense>
    </div>
  );
}
