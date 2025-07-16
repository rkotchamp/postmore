import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import User from "@/app/models/userSchema";
import { connectToMongoose } from "@/app/lib/db/mongoose";

// Get the proper base URL for callbacks
const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          await connectToMongoose();

          // Find user by email and explicitly select the password field
          const user = await User.findOne({ email: credentials.email }).select(
            "+password"
          );

          if (!user) {
            throw new Error("Invalid email or password");
          }

          // Check if password matches
          const isMatch = await user.matchPassword(credentials.password);

          if (!isMatch) {
            throw new Error("Invalid email or password");
          }

          // Return user object without password
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error("Credentials auth error:", error);
          throw error;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account", // Force Google to always show the account selection
          access_type: "offline",
          response_type: "code",
        },
      },
      callbackUrl: `${baseUrl}/api/auth/callback/google`,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackUrl: `${baseUrl}/api/auth/callback/github`,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === "credentials") {
        return true; // Allow credential login
      }

      try {
        await connectToMongoose();

        // Check if user already exists
        const email = profile.email || `${profile.login}@github.com`;
        const existingUser = await User.findOne({ email: email });

        if (!existingUser) {
          // Create a new user

          const newUser = new User({
            name: profile.name || profile.login,
            email: email,
            authProvider: account.provider,
            emailVerified: true,
            image: profile.picture || profile.avatar_url,
          });

          // Add the appropriate social ID
          if (account.provider === "google") {
            newUser.googleId = profile.sub;
          } else if (account.provider === "github") {
            newUser.githubId = profile.id.toString();
          }

          await newUser.save();
        } else {
          // Update existing user with the provider ID if not already set
          let needsUpdate = false;

          if (account.provider === "google" && !existingUser.googleId) {
            existingUser.googleId = profile.sub;
            needsUpdate = true;
          } else if (account.provider === "github" && !existingUser.githubId) {
            existingUser.githubId = profile.id.toString();
            needsUpdate = true;
          }

          if (needsUpdate) {
            existingUser.image =
              existingUser.image || profile.picture || profile.avatar_url;
            await existingUser.save();
          }
        }

        return true;
      } catch (error) {
        console.error(`Error during ${account.provider} sign in:`, error);
        return true; // Still allow sign-in even if DB operations fail
      }
    },
    async session({ session, token }) {
      // Add user ID to session
      if (token.id) {
        session.user.id = token.id;
      } else {
      }

      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      } else {
      }

      return token;
    },
    async redirect({ url, baseUrl }) {
      console.log("🔄 NextAuth redirect callback:", { url, baseUrl });

      // Handle callback URLs
      if (url.includes("/api/auth/callback/")) {
        const urlObj = new URL(url);
        const callbackUrl = urlObj.searchParams.get("callbackUrl");

        if (callbackUrl) {
          const decodedCallbackUrl = decodeURIComponent(callbackUrl);
          console.log("📍 Decoded callback URL:", decodedCallbackUrl);

          // Ensure it's a safe redirect within the same origin
          if (decodedCallbackUrl.startsWith(baseUrl)) {
            // Don't redirect to login/register pages if user is authenticated
            if (
              decodedCallbackUrl.includes("/auth/login") ||
              decodedCallbackUrl.includes("/auth/register")
            ) {
              console.log(
                "🚫 Preventing redirect to auth page, going to dashboard"
              );
              return `${baseUrl}/dashboard`;
            }
            console.log("✅ Redirecting to callback URL:", decodedCallbackUrl);
            return decodedCallbackUrl;
          }
        }

        // Default to dashboard after authentication
        console.log("📱 No valid callback URL, redirecting to dashboard");
        return `${baseUrl}/dashboard`;
      }

      // Handle sign-in redirects
      if (url.includes("/api/auth/signin")) {
        console.log("🔐 Sign-in detected, redirecting to dashboard");
        return `${baseUrl}/dashboard`;
      }

      // If trying to go to root or auth pages when authenticated, redirect to dashboard
      if (url === baseUrl || url === `${baseUrl}/` || url.includes("/auth/")) {
        console.log("🏠 Redirecting root/auth access to dashboard");
        return `${baseUrl}/dashboard`;
      }

      // If URL starts with baseUrl, allow it
      if (url.startsWith(baseUrl)) {
        console.log("🏠 URL starts with baseUrl, allowing:", url);
        return url;
      }

      // Default fallback to dashboard for authenticated users
      console.log("🔙 Default fallback to dashboard");
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug logs
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
