import { Header } from "@/app/components/HomePage/Header";
import { Footer } from "@/app/components/HomePage/Footer";
import { BlogCards } from "./components/BlogCards";

export const metadata = {
  title: "The Post Bridge Blog - PostMoore",
  description:
    "Learn the strategies top creators use to grow their audience, go viral consistently, and turn their content into a thriving source of traffic to their business.",
};

export default function BlogsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Blog Header */}
          <div className="text-center max-w-4xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Creator's Hub
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Learn the strategies top creators use to grow their audience, go viral consistently, 
              and turn their content into a thriving source of traffic to their business.
            </p>
          </div>

          {/* Blog Cards Component */}
          <BlogCards />
        </div>
      </main>
      <Footer />
    </div>
  );
}