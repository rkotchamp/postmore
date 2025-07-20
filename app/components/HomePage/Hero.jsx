import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Platforms } from "./Platform";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background min-h-screen flex items-center">
      {/* Background decorative elements for dark mode visual interest */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-primary/20 dark:from-primary/25 dark:via-primary/10 dark:to-primary/30"></div>
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,transparent,rgba(255,255,255,0.1),transparent)] opacity-40 dark:opacity-30"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="mx-auto max-w-8xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left max-w-3xl">
              <Badge
                variant="secondary"
                className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 backdrop-blur-sm"
              >
                🚀 New: AI-powered content suggestions now available
              </Badge>

              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
                Schedule content across{" "}
                <span className="text-primary">
                  all platforms
                </span>{" "}
                in minutes
              </h1>

              <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl lg:max-w-none">
                The fastest way to post and grow on all platforms
              </p>

              <div className="mt-8 max-w-lg lg:max-w-none space-y-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <div className="mr-3 flex-shrink-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-primary-foreground"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span>Post to all major platforms in one click</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <div className="mr-3 flex-shrink-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-primary-foreground"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span>Schedule content for the perfect posting time</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <div className="mr-3 flex-shrink-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-primary-foreground"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span>Customize content for each platform</span>
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <div className="mr-3 flex-shrink-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-primary-foreground"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span>Generate viral videos using our studio templates</span>
                </div>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-base font-semibold shadow-lg"
                  >
                    Try it for free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-3"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Watch Demo
                </Button>
              </div>

              <div className="mt-8 flex items-center justify-center lg:justify-start space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <span className="font-semibold text-foreground">50,000+</span>
                  <span className="ml-1">creators trust us</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-foreground">4.9/5</span>
                  <span className="ml-1">rating</span>
                </div>
                <div className="flex items-center">
                  <span className="font-semibold text-foreground">99.9%</span>
                  <span className="ml-1">uptime</span>
                </div>
              </div>
            </div>

            {/* Right Column - Hero Image */}
            <div className="relative lg:ml-auto">
              <div className="relative w-full max-w-xl mx-auto lg:max-w-none">
                {/* Enhanced glow effect behind image that adapts to theme */}
                <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 blur-3xl scale-125 rounded-full"></div>
                
                <div className="relative">
                  <Image
                    src="/PostmooreHero.png"
                    alt="Social media platforms in a basket - manage all your content"
                    width={700}
                    height={700}
                    className="w-full h-auto object-contain relative z-10 scale-125"
                    priority
                  />
                  
                  {/* Glossy badge overlapping the basket */}
                  <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg border border-gray-200/30 dark:border-gray-700/30 rounded-2xl px-6 py-5 shadow-xl">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          All your social media posts in one basket
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Platforms row under the basket */}
                <div className="mt-8">
                  <Platforms />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
