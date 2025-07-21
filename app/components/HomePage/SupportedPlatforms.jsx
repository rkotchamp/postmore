import { Card, CardContent } from "@/app/components/ui/card";
import { Plus } from "lucide-react";

export function SupportedPlatforms() {
  const platforms = [
    {
      name: "Twitter/X",
      icon: (
        <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      bgColor: "bg-white"
    },
    {
      name: "Instagram",
      icon: (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      bgColor: "bg-gradient-to-r from-purple-500 to-pink-500"
    },
    {
      name: "LinkedIn",
      icon: (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
      bgColor: "bg-blue-600"
    },
    {
      name: "Facebook",
      icon: (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      bgColor: "bg-blue-600"
    },
    {
      name: "TikTok",
      icon: (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      ),
      bgColor: "bg-black"
    },
    {
      name: "YouTube",
      icon: (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      ),
      bgColor: "bg-red-600"
    },
    {
      name: "Bluesky",
      icon: (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.271-.04.402-.06-.134.02-.266.041-.402.06C3.335 13.905.409 15.567.624 18.655.378 19.487 0 24.477 0 25.166c0 .688.139 1.86.902 2.203.659.299 1.664.621 4.3-1.24C7.954 24.187 10.913 20.248 12 18.134c1.087 2.114 4.046 6.053 6.798 7.995 2.636 1.861 3.641 1.539 4.3 1.24.763-.343.902-1.515.902-2.203 0-.689-.378-5.679-.624-6.511-.215-3.088-2.711-4.75-6.383-4.456-.136.019-.268.04-.402.06.134-.02.266-.041.402-.06 2.672.296 5.568-.628 6.383-3.364.246-.829.624-5.789.624-6.479 0-.688-.139-1.86-.902-2.203C20.439 1.266 19.434.944 16.798 2.805 14.046 4.747 11.087 8.686 12 10.8z"/>
        </svg>
      ),
      bgColor: "bg-blue-500"
    },
    {
      name: "Threads",
      icon: (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.353 1.333-3.270.982-1.007 2.4-1.548 4.147-1.548a6.5 6.5 0 0 1 2.065.33c-.17-.4-.49-.92-.835-1.22-.619-.539-1.528-.809-2.762-.809-1.235 0-2.24.269-2.988.801-.805.574-1.263 1.41-1.263 2.307 0 .633.173 1.2.487 1.716.27.443.646.810 1.118 1.089l-1.268 1.794c-.949-.665-1.694-1.57-2.178-2.611C2.051 10.8 1.872 9.033 1.872 7.076c0-1.983.18-3.7.537-5.076C3.135.44 4.527-.706 6.369-1.185 7.954-1.56 9.818-1.728 12.115-1.728c4.068 0 7.15 1.194 9.156 3.548C22.61 3.395 23.63 5.462 24 8.016l-2.037.55c-.295-2.036-1.04-3.65-2.213-4.792-1.548-1.506-3.8-2.268-6.705-2.268-4.618 0-7.643 2.171-8.993 6.451-.675 2.142-.675 4.817 0 6.958 1.35 4.28 4.375 6.451 8.993 6.451 3.618 0 6.344-1.498 8.107-4.459 1.757-2.949 1.537-6.562-.654-10.742l1.77-1.01c2.731 5.235 3.064 9.817.988 13.614-2.075 3.797-5.58 5.721-10.427 5.721z"/>
        </svg>
      ),
      bgColor: "bg-black"
    },
    {
      name: "Pinterest",
      icon: (
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.347-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.747 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001.012.001z"/>
        </svg>
      ),
      bgColor: "bg-red-600"
    },
    {
      name: "Request a Platform",
      icon: <Plus className="w-8 h-8 text-muted-foreground" />,
      bgColor: "bg-muted/30",
      isRequestCard: true,
      href: "https://insigh.to/b/postmoore"
    }
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Supported Platforms
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Use postMoore to schedule and post your content across all of these social media platforms at the same time - all from one place.
          </p>
        </div>

        {/* Platform Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {platforms.map((platform, index) => (
            platform.href ? (
              <a
                key={index}
                href={platform.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card 
                  className={`bg-card border-border hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer ${
                    platform.isRequestCard ? 'hover:border-primary/30' : ''
                  }`}
                >
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 ${platform.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110`}>
                      {platform.icon}
                    </div>
                    <h3 className={`font-semibold ${
                      platform.isRequestCard ? 'text-muted-foreground' : 'text-card-foreground'
                    }`}>
                      {platform.name}
                    </h3>
                  </CardContent>
                </Card>
              </a>
            ) : (
              <Card 
                key={index} 
                className={`bg-card border-border hover:shadow-lg transition-all duration-300 hover:scale-105 ${
                  platform.isRequestCard ? 'hover:border-primary/30' : ''
                }`}
              >
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 ${platform.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform duration-300 hover:scale-110`}>
                    {platform.icon}
                  </div>
                  <h3 className={`font-semibold ${
                    platform.isRequestCard ? 'text-muted-foreground' : 'text-card-foreground'
                  }`}>
                    {platform.name}
                  </h3>
                </CardContent>
              </Card>
            )
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Want to see support for another platform?
          </p>
          <a
            href="https://insigh.to/b/postmoore"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-primary hover:text-primary/80 font-semibold transition-colors"
          >
            Request a platform
            <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}