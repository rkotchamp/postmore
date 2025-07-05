import { Card } from "@/app/components/ui/card";

export function Platforms() {
  const platforms = [
    { name: "Facebook", color: "bg-blue-600" },
    {
      name: "Instagram",
      color: "bg-gradient-to-r from-purple-500 to-pink-500",
    },
    { name: "TikTok", color: "bg-black" },
    { name: "Twitter", color: "bg-sky-500" },
    { name: "LinkedIn", color: "bg-blue-700" },
    { name: "YouTube", color: "bg-red-600" },
    { name: "Pinterest", color: "bg-red-500" },
    { name: "Snapchat", color: "bg-yellow-400" },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Connect all your social platforms
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Seamlessly manage content across all major social media platforms
            from one unified dashboard
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {platforms.map((platform) => (
            <Card
              key={platform.name}
              className="p-6 text-center hover:shadow-lg transition-shadow"
            >
              <div
                className={`w-12 h-12 rounded-lg ${platform.color} mx-auto mb-3 flex items-center justify-center`}
              >
                <span className="text-white font-bold text-sm">
                  {platform.name.charAt(0)}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">
                {platform.name}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
