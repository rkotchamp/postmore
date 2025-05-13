import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import mongoose from "mongoose";
import { apiManager } from "@/app/lib/api/services/apiManager";

// Add this to ensure we have the Post model available
// This prevents errors with mongoose model initialization
let Post;
try {
  Post = mongoose.model("Post");
} catch (e) {
  // Model not registered yet, so we need to import the schema
  require("@/app/models/PostSchema");
  Post = mongoose.model("Post");
}

/**
 * POST handler for submitting posts
 * This API endpoint handles both immediate and scheduled posts
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
    console.log("Received post data:", JSON.stringify(postData));

    // Validate required fields
    if (!postData) {
      return NextResponse.json(
        { error: "Post data is required" },
        { status: 400 }
      );
    }

    // Extract and validate post content
    const { contentType, text, media, accounts, captions, schedule } = postData;

    // Validate content type and content
    if (!contentType) {
      return NextResponse.json(
        { error: "Content type is required" },
        { status: 400 }
      );
    }

    if (contentType === "text" && !text) {
      return NextResponse.json(
        { error: "Text content is required for text posts" },
        { status: 400 }
      );
    }

    if (contentType === "media" && (!media || media.length === 0)) {
      return NextResponse.json(
        { error: "Media files are required for media posts" },
        { status: 400 }
      );
    }

    // Validate accounts
    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: "At least one account is required" },
        { status: 400 }
      );
    }

    console.log("Processing accounts:", JSON.stringify(accounts));

    // Ensure database connection
    await ensureDbConnection();

    // Construct Post object for the database
    const postDocument = {
      userId: session.user.id,
      contentType,
      text: text || "",
      media: media || [],
      accounts: accounts.map((account) => ({
        id: account.id,
        name: account.name,
        email: account.email,
        type: account.type,
        platformId: account.platformId || account.id,
      })),
      captions: captions || {
        mode: "single",
        single: text || "",
        multipleCaptions: {},
      },
      schedule: schedule || { type: "now" },
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create a new post document in the database
    console.log("Creating post document in database");
    try {
      const savedPost = await Post.create(postDocument);
      console.log("Post created in database:", savedPost._id.toString());

      // Extract platform/account targets
      const targets = accounts.map((account) => ({
        platform: account.type,
        account: account,
      }));

      // Prepare response variable
      let results;

      // Process based on schedule type
      if (schedule?.type === "scheduled" && schedule?.at) {
        console.log("Scheduling post for later");
        // Schedule the post for later publication
        results = await Promise.all(
          targets.map(({ platform, account }) =>
            apiManager.schedulePost(
              platform,
              account,
              {
                postId: savedPost._id.toString(),
                text: text || "",
                media: media || [],
                caption: getCaptionForPlatform(captions, platform, account.id),
              },
              new Date(schedule.at)
            )
          )
        );

        // Update post status
        savedPost.status = "scheduled";
        await savedPost.save();
      } else {
        console.log(
          "Posting immediately to platforms:",
          targets.map((t) => t.platform).join(", ")
        );
        // Post immediately
        results = await apiManager.postToMultiplePlatforms(targets, {
          postId: savedPost._id.toString(),
          contentType: contentType,
          text: text || "",
          media: media || [],
          captions,
        });
        console.log("Post results:", JSON.stringify(results));

        // Update post status based on results
        const allSucceeded = results.every((result) => result.success);
        savedPost.status = allSucceeded ? "published" : "failed";
        savedPost.results = results;
        await savedPost.save();
      }

      // Return the post with results
      return NextResponse.json({
        success: true,
        post: savedPost,
        results,
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error submitting post:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit post" },
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

/**
 * Helper function to get the appropriate caption for a platform
 */
function getCaptionForPlatform(captions, platform, accountId) {
  if (!captions) return "";

  if (captions.mode === "single") {
    return captions.single || "";
  }

  // Return account-specific caption or fall back to default
  return captions.multipleCaptions?.[accountId] || captions.single || "";
}
