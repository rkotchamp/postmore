import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/providers/themeProvider";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { Toaster } from "@/app/components/ui/sonner";
import { QueryProvider } from "@/app/providers/QueryProvider";
import { FetchAllAccountsProvider } from "@/app/context/FetchAllAccountsContext";
import { PostProvider } from "@/app/context/FetchPostContext";
import { AllPostsProvider } from "@/app/context/FetchAllPostsContext";
import { UserProvider } from "@/app/context/UserContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: {
    default: "PostMoore - Social Media Scheduling Platform",
    template: "%s | PostMoore",
  },
  description:
    "Schedule and publish content to YouTube Shorts, TikTok, Instagram, Bluesky, and more from one dashboard. Save time and grow your social media presence.",
  keywords: [
    "social media scheduler",
    "content scheduling",
    "multi-platform posting",
  ],
  authors: [{ name: "PostMoore Team" }],
  creator: "postMoore",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://postmoo.re"
  ),
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "PostMoore",
  },
  twitter: {
    card: "summary_large_image",
    site: "@postmoore_",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <UserProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem
                disableTransitionOnChange
              >
                <FetchAllAccountsProvider>
                  <PostProvider>
                    <AllPostsProvider>
                      {children}
                      <Toaster />
                    </AllPostsProvider>
                  </PostProvider>
                </FetchAllAccountsProvider>
              </ThemeProvider>
            </UserProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
