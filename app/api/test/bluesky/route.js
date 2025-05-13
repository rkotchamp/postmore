import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import mongoose from "mongoose";
import { apiManager } from "@/app/lib/api/services/apiManager";

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
 * Test endpoint for Bluesky posting
 * This is a utility route for testing the Bluesky service
 */
export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse request body
    const postData = await request.json();
    console.log("Received test post data:", JSON.stringify(postData));

    // Extract parameters
    const { accountId, text, media } = postData;

    // Validate required fields
    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    if (!text && (!media || media.length === 0)) {
      return NextResponse.json(
        { error: "Text or media is required" },
        { status: 400 }
      );
    }

    // Ensure database connection
    await ensureDbConnection();

    // Get the Bluesky account from the database
    const account = await Account.findOne({
      _id: accountId,
      userId: session.user.id,
      platform: "bluesky",
    });

    if (!account) {
      return NextResponse.json(
        { error: "Bluesky account not found" },
        { status: 404 }
      );
    }

    // Prepare post data
    const testPostData = {
      contentType: media && media.length > 0 ? "media" : "text",
      text: text || "",
      media: media || [],
      captions: {
        mode: "single",
        single: text || "",
      },
    };

    // Post to Bluesky
    console.log("Posting test message to Bluesky...");
    const result = await apiManager.postToPlatform(
      "bluesky",
      account,
      testPostData
    );

    // Return the result
    return NextResponse.json({
      success: result.success,
      message: "Bluesky test post result",
      result,
    });
  } catch (error) {
    console.error("Error in Bluesky test endpoint:", error);
    return NextResponse.json(
      { error: error.message || "Failed to test Bluesky post" },
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
