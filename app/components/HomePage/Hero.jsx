import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background to-muted py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Badge
            variant="secondary"
            className="mb-6 bg-muted text-primary hover:bg-muted/80"
          >
            🚀 New: AI-powered content suggestions now available
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Schedule content across{" "}
            <span className="text-primary">all platforms</span> in minutes
          </h1>

          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            Streamline your social media workflow with our powerful scheduling
            tool. Manage Facebook, Instagram, TikTok, Twitter, LinkedIn and more
            from one dashboard.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3"
              >
                Start 14-Day Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <Button
              variant="outline"
              size="lg"
              className="px-8 py-3 bg-transparent"
            >
              <Play className="mr-2 h-4 w-4" />
              Watch Demo
            </Button>
          </div>

          <div className="mt-8 flex items-center justify-center space-x-6 text-sm text-muted-foreground">
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
      </div>
    </section>
  );
}
