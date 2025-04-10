"use client";

import Link from "next/link";
import { SendHorizontal } from "lucide-react";
import { ResetPasswordReviews } from "./ResetPasswordReviews";

export function ResetPasswordLayout({ children }) {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Left panel with logo and design */}
      <div className="hidden lg:flex flex-col bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 p-10 text-white dark:border-r relative">
        <div className="flex items-center gap-2 text-lg font-bold text-primary">
          <SendHorizontal className="h-6 w-6" />
          <span>Postmore</span>
        </div>

        {/* Abstract shapes for visual interest */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-purple-500/10 rounded-full filter blur-3xl"></div>

        {/* Testimonial card positioned at the bottom */}
        <div className="mt-auto mb-10 w-full max-w-md">
          <ResetPasswordReviews />
        </div>
      </div>

      {/* Right panel with reset password form */}
      <div className="flex items-center justify-center p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] md:w-[450px]">
          <div className="flex flex-col space-y-2 text-center mb-8">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold lg:hidden">
              <SendHorizontal className="h-6 w-6 text-primary" />
              <span>Postmore</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Reset your password
            </h1>
            <p className="text-sm text-muted-foreground">
              Get a link to create a new password
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
