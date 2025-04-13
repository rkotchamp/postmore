import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToMongoose } from "@/app/lib/db/mongoose";
import SocialAccount from "@/app/models/SocialAccount";
import mongoose from "mongoose";

/**
 * GET endpoint to fetch a user's social accounts
 * Optionally filtered by platform
 */
export async function GET(request) {
  console.log("========== Social Accounts API Called ==========");

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const testMode = searchParams.get("testmode") === "true";
    console.log("Query parameters:", { platform, testMode });

    // Check if we're in TikTok sandbox test mode
    const isSandbox = process.env.TIKTOK_SANDBOX_MODE === "true";

    // If we're requesting TikTok accounts in sandbox mode, we can return test data
    /* Temporarily disabled to test real TikTok authentication
    if (
      platform === "tiktok" &&
      isSandbox &&
      (testMode || !process.env.NEXT_PUBLIC_APP_URL?.includes("localhost"))
    ) {
      console.log("Returning sandbox TikTok account data");

      // Return a mock TikTok account for testing
      const mockTikTokAccount = {
        _id: "sandbox-tiktok-account-id",
        userId: "sandbox-user-id",
        platform: "tiktok",
        platformAccountId: "sandbox-platform-id",
        displayName: "TikTok Sandbox User",
        profileImage:
          "https://p16-sign.tiktokcdn-us.com/tos-useast5-avt-0068-tx/default_avatar.webp",
        platformUsername: "sandbox_user",
        accessToken: "***REDACTED***",
        refreshToken: "***REDACTED***",
        tokenExpiry: new Date(Date.now() + 86400 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log(
        "========== Social Accounts API Completed Successfully (Sandbox Mode) =========="
      );
      return NextResponse.json({ accounts: [mockTikTokAccount] });
    }
    */

    // Get session to identify the user
    const session = await getServerSession(authOptions);
    console.log("Session data:", {
      exists: !!session,
      user: session?.user
        ? { id: session.user.id, name: session.user.name }
        : null,
    });

    if (!session || !session.user?.id) {
      console.error("No authenticated user found in session");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Connect to database
    console.log("Connecting to MongoDB...");
    await connectToMongoose();

    // Convert user ID if needed
    const userId = session.user.id;
    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;
    console.log("User ID conversion:", {
      original: userId,
      converted: userObjectId.toString(),
    });

    // Build the query based on parameters
    const query = { userId: userObjectId };
    if (platform) {
      query.platform = platform;
    }
    console.log("Database query:", query);

    // Fetch accounts from database
    console.log("Fetching social accounts from database...");
    const accounts = await SocialAccount.find(query).lean();

    // Log the results
    console.log("Found accounts:", {
      count: accounts.length,
      platforms: accounts.map((acc) => acc.platform),
      ids: accounts.map((acc) => acc._id.toString()),
    });

    // For security, remove sensitive information
    const safeAccounts = accounts.map((account) => ({
      ...account,
      accessToken: "***REDACTED***",
      refreshToken: "***REDACTED***",
    }));

    console.log(
      "========== Social Accounts API Completed Successfully =========="
    );

    // Return the accounts
    return NextResponse.json({ accounts: safeAccounts });
  } catch (error) {
    console.error("========== Social Accounts API Failed ==========");
    console.error("Error fetching social accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch social accounts: " + error.message },
      { status: 500 }
    );
  }
}
