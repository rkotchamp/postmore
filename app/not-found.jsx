import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-8">
        {/* Big 404 Number */}
        <div className="relative">
          <h1 className="text-[200px] md:text-[300px] font-bold text-primary/20 leading-none select-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Page Not Found
              </h2>
              <p className="text-muted-foreground text-lg max-w-md">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>
          </div>
        </div>

        {/* Return Home Button */}
        <div className="pt-8">
          <Link href="/">
            <Button size="lg" className="text-lg px-8 py-6 gap-2">
              <Home className="h-5 w-5" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
