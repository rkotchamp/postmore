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

      console.log(
        `${account.provider} signIn callback running with profile:`,
        profile?.email || profile?.login
      );

      try {
        await connectToMongoose();

        // Check if user already exists
        const email = profile.email || `${profile.login}@github.com`;
        const existingUser = await User.findOne({ email: email });
        console.log("Existing user:", existingUser ? "Found" : "Not found");

        if (!existingUser) {
          // Create a new user
          console.log(`Creating new user with ${account.provider}`);
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
          console.log("New user created successfully");
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
            console.log(`Updating existing user with ${account.provider} ID`);
            existingUser.image =
              existingUser.image || profile.picture || profile.avatar_url;
            await existingUser.save();
            console.log("User updated successfully");
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
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      console.log("NextAuth redirect called with:", { url, baseUrl });

      // After sign-in with either provider, redirect to dashboard
      if (url.includes("/api/auth/callback/")) {
        return `${baseUrl}/dashboard`;
      }

      if (url.startsWith(baseUrl)) {
        return url;
      }

      return baseUrl;
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
