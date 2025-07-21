"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { Menu, X } from "lucide-react";
import Image from "next/image";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "/prices" },
    { name: "Reviews", href: "#testimonials" },
    { name: "Privacy & Terms", href: "/privacy" },
    { name: "Blog", href: "/blogs" },
  ];
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/">
              <Image
                src="/PostmooreSvg.svg"
                alt="postMoore Logo"
                width={100}
                height={32}
                className="h-8 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-primary hover:bg-primary/90">
                Try it for free
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-2xl border-l border-border">
            <div className="flex flex-col h-full">
              {/* Mobile menu header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                  <Image
                    src="/PostmooreSvg.svg"
                    alt="postMoore Logo"
                    width={100}
                    height={28}
                    className="h-7 w-auto object-contain"
                  />
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="hover:bg-white/15 rounded-full w-8 h-8 p-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Mobile navigation */}
              <nav className="flex-1 px-6 py-8 space-y-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block px-4 py-4 text-lg font-medium text-foreground hover:text-primary hover:bg-white/10 rounded-xl transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-white/15"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                
                {/* Sign In Link */}
                <div className="pt-6 mt-6 border-t border-border">
                  <Link
                    href="/auth/login"
                    className="block px-4 py-4 text-lg font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-xl transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-white/15"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                </div>
              </nav>

              {/* Mobile CTA */}
              <div className="p-6 border-t border-border">
                <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-lg py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 border border-primary/20">
                    Try it for free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
