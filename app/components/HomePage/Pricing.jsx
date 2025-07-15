import { Suspense } from "react";
import { PricingCards } from "@/app/prices/components/PricingCards";

export function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your needs. All plans include a 14-day
            free trial.
          </p>
        </div>

        <Suspense
          fallback={<div className="text-center">Loading pricing...</div>}
        >
          <PricingCards mode="home" />
        </Suspense>

        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            Need a custom plan?{" "}
            <a
              href="#"
              className="text-primary hover:text-primary/80 font-semibold"
            >
              Contact our sales team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
