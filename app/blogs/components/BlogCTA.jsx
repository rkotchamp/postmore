import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function BlogCTA({ 
  variant = "default",
  title = "Try PostMoore for free",
  subtitle = "180,000+ creators, small businesses, and marketers use PostMoore to grow their audiences every month.",
  buttonText = "Get started now",
  className = ""
}) {
  const baseClasses = "rounded-2xl text-center transition-all duration-300 hover:shadow-lg";
  
  const variants = {
    default: "bg-muted/50 p-8 border border-border",
    highlight: "bg-gradient-to-r from-primary/10 to-primary/5 p-8 border border-primary/20",
    minimal: "bg-background p-6 border-2 border-dashed border-border hover:border-primary/50",
    card: "bg-card p-8 shadow-sm border border-border"
  };

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`}>
      <div className="max-w-md mx-auto space-y-4">
        <h3 className="text-2xl md:text-3xl font-bold text-foreground">
          {title}
        </h3>
        
        <p className="text-muted-foreground leading-relaxed">
          {subtitle}
        </p>
        
        <Link 
          href="/auth/register"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold hover:bg-primary/90 transition-colors group"
        >
          {buttonText}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

// Specific variants for different use cases
export function InlineBlogCTA() {
  return (
    <BlogCTA 
      variant="highlight"
      className="my-12"
      title="Ready to grow your audience?"
      subtitle="Join thousands of creators who trust PostMoore to manage their social media presence."
      buttonText="Start free trial"
    />
  );
}

export function BottomBlogCTA() {
  return (
    <BlogCTA 
      variant="card"
      className="mt-16"
      title="Try PostMoore for free"
      subtitle="180,000+ creators, small businesses, and marketers use PostMoore to grow their audiences every month."
      buttonText="Get started now"
    />
  );
}

export function MinimalBlogCTA() {
  return (
    <BlogCTA 
      variant="minimal"
      className="my-8"
      title="Want to learn more?"
      subtitle="Discover how PostMoore can streamline your social media workflow."
      buttonText="Try it free"
    />
  );
}