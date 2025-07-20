import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Calendar, BarChart3, Users, Zap, Clock, Shield } from "lucide-react";

export function Features() {
  const features = [
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description:
        "Schedule posts weeks in advance with our intelligent calendar system and optimal timing suggestions.",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description:
        "Track performance across all platforms with detailed insights and engagement metrics.",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description:
        "Work together with your team using approval workflows, comments, and role-based permissions.",
    },
    {
      icon: Zap,
      title: "AI Content Assistant",
      description:
        "Generate engaging captions and hashtags with our AI-powered content suggestions.",
    },
    {
      icon: Clock,
      title: "Bulk Upload",
      description:
        "Upload and schedule hundreds of posts at once with our CSV import and bulk editing tools.",
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description:
        "Bank-level security with SOC 2 compliance, 2FA, and advanced user management.",
    },
  ];

  return (
    <section id="features" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Everything you need to scale your social presence
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to save you time and help you create
            better content
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="bg-card border-border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl text-card-foreground">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
