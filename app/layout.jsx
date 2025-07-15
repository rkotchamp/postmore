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
  title: "Your App Title",
  description: "Your app description",
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
