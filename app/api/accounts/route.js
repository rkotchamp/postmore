import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import mongoose from "mongoose";

// Add this to ensure we have the models available
let Account;
try {
  Account = mongoose.model("Account");
} catch (e) {
  // Model not registered yet, so we need to import the schema
  require("@/app/models/AccountSchema");
  Account = mongoose.model("Account");
}

/**
 * GET endpoint for fetching user's accounts
 * This endpoint returns accounts filtered by platform if specified
 */
export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Extract query parameters
    const url = new URL(request.url);
    const platform = url.searchParams.get("platform");

    // Ensure database connection
    await ensureDbConnection();

    // Build query - always filter by user ID
    const query = { userId: session.user.id };

    // Add platform filter if specified
    if (platform) {
      query.platform = platform;
    }

    // Fetch accounts matching the query
    const accounts = await Account.find(query).sort({ createdAt: -1 });

    // Return the accounts
    return NextResponse.json({
      success: true,
      message: `Found ${accounts.length} accounts`,
      accounts: accounts.map((account) => ({
        _id: account._id,
        userId: account.userId,
        platform: account.platform,
        platformAccountId: account.platformAccountId,
        platformUsername: account.platformUsername,
        displayName: account.displayName,
        profileImage: account.profileImage,
        status: account.status,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        // Don't return sensitive data like tokens
      })),
    });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

/**
 * Ensure database connection is established
 */
async function ensureDbConnection() {
  if (mongoose.connection.readyState !== 1) {
    // Not connected, so connect
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI not defined in environment variables");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
  }
}
