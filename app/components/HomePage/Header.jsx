import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import Image from "next/image";

export function Header() {
  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/">
              <Image
                src="/PostmooreSvg.svg"
                alt="PostMoore Logo"
                width={100}
                height={32}
                className="h-8 w-auto object-contain"
              />
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="#features"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#testimonials"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Reviews
            </Link>
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy & Terms
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <Link href="auth/login">
              <Button variant="ghost" className="hidden sm:inline-flex">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button className="bg-primary hover:bg-primary/90">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
