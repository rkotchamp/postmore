"use client";

import Link from "next/link";
import Image from "next/image";
import { RegisterReviews } from "./RegisterReviews";

export function RegisterLayout({ children }) {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Left panel with logo and design */}
      <div className="hidden lg:flex flex-col p-10 text-white dark:border-r relative overflow-hidden">
        {/* Background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/signUpAndLoginBG.webm" type="video/webm" />
        </video>

        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/40 via-purple-600/30 to-pink-600/40"></div>

        {/* Content on top of video */}
        <div className="relative z-10 flex flex-col h-full">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold text-primary hover:opacity-80 transition-opacity"
          >
            <Image
              src="/PostmooreSvg.svg"
              alt="PostMoore Logo"
              width={120}
              height={32}
              className="h-8 w-auto object-contain"
            />
          </Link>

          {/* Testimonial card positioned at the bottom */}
          <div className="mt-auto mb-10 w-full max-w-md">
            <RegisterReviews />
          </div>
        </div>
      </div>

      {/* Right panel with register form */}
      <div className="flex items-center justify-center p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] md:w-[450px]">
          <div className="flex flex-col space-y-2 text-center mb-8">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 text-2xl font-bold lg:hidden mb-4 hover:opacity-80 transition-opacity"
            >
              <Image
                src="/PostmooreSvg.svg"
                alt="PostMoore Logo"
                width={120}
                height={32}
                className="h-8 w-auto object-contain"
              />
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">
              Create an account
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your information below to create an account
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
