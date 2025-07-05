import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Check } from "lucide-react";

export function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "$19",
      description: "Perfect for individual creators and small businesses",
      features: [
        "3 social media accounts",
        "30 scheduled posts per month",
        "Basic analytics",
        "Email support",
        "Content calendar",
      ],
      popular: false,
    },
    {
      name: "Professional",
      price: "$49",
      description: "Ideal for growing businesses and marketing teams",
      features: [
        "10 social media accounts",
        "Unlimited scheduled posts",
        "Advanced analytics & reporting",
        "Team collaboration (5 users)",
        "AI content suggestions",
        "Priority support",
        "Custom branding",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$149",
      description: "For large organizations with advanced needs",
      features: [
        "Unlimited social media accounts",
        "Unlimited scheduled posts",
        "Advanced analytics & white-label reports",
        "Unlimited team members",
        "AI content suggestions",
        "24/7 phone support",
        "Custom integrations",
        "Dedicated account manager",
      ],
      popular: false,
    },
  ];

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

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative ${
                plan.popular
                  ? "border-orange-500 shadow-xl scale-105"
                  : "border-gray-200"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary hover:bg-primary/90">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <CardDescription className="mt-4">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-primary hover:bg-primary/90"
                      : "bg-gray-900 hover:bg-gray-800"
                  }`}
                  size="lg"
                >
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

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
