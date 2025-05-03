import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/providers/themeProvider";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { Toaster } from "@/app/components/ui/sonner";
import { QueryProvider } from "@/app/providers/QueryProvider";
import { FetchAllAccountsProvider } from "@/app/context/FetchAllAccountsContext";
import { PostDataProvider } from "@/app/context/PostDataContext";
import { ProgressCountProvider } from "@/app/context/ProgressCountContext";
import { MediaTextFlowProvider } from "@/app/context/MediaTextFlowContext";

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
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              <FetchAllAccountsProvider>
                <PostDataProvider>
                  <ProgressCountProvider>
                    <MediaTextFlowProvider>
                      {children}
                      <Toaster />
                    </MediaTextFlowProvider>
                  </ProgressCountProvider>
                </PostDataProvider>
              </FetchAllAccountsProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
