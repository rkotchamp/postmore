import { Button } from "@/app/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="py-20 bg-gradient-to-r from-primary to-secondary">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to transform your social media strategy?
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8 leading-relaxed">
            Join over 50,000 creators and businesses who trust PostMoore to
            manage their social media presence. Start your free trial today and
            see the difference.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              className="bg-background text-primary hover:bg-background/90 px-8 py-3"
            >
              Start 14-Day Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary px-8 py-3 bg-transparent"
            >
              Schedule a Demo
            </Button>
          </div>
          <p className="text-primary-foreground/80 text-sm mt-6">
            No credit card required • Cancel anytime • 24/7 support
          </p>
        </div>
      </div>
    </section>
  );
}
