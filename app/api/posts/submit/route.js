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
  try {
    require("@/app/models/PostSchema");
    Post = mongoose.model("Post");
  } catch (modelError) {
    console.error("Failed to load Post schema:", modelError);
  }
}

/**
 * POST handler for submitting posts
 * This API endpoint handles both immediate and scheduled posts
 */
export async function POST(request) {
  console.log("API Route: /api/posts/submit POST handler started");

  try {
    // Check authentication
    try {
      const session = await getServerSession();
      if (!session || !session.user) {
        console.log("API Route: Authentication failed, no valid session");
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      console.log(
        "API Route: Authentication successful for user:",
        session.user.id
      );
    } catch (authError) {
      console.error("API Route: Authentication error:", authError);
      return NextResponse.json(
        { error: `Authentication error: ${authError.message}` },
        { status: 401 }
      );
    }

    // Parse request body
    let postData;
    try {
      postData = await request.json();
      console.log("API Route: Request body parsed successfully");
      console.log("API Route: Post data overview:", {
        contentType: postData.contentType,
        mediaCount: postData.media?.length || 0,
        accountCount: postData.accounts?.length || 0,
        captionMode: postData.captions?.mode,
        scheduleType: postData.schedule?.type,
      });
    } catch (parseError) {
      console.error("API Route: Error parsing request body:", parseError);
      return NextResponse.json(
        { error: `Failed to parse request body: ${parseError.message}` },
        { status: 400 }
      );
    }

    // Add special debugging for Bluesky accounts
    if (postData.accounts) {
      const blueskyAccounts = postData.accounts.filter(
        (account) => account.type === "bluesky"
      );
      if (blueskyAccounts.length > 0) {
        console.log(
          "API Route: Found Bluesky accounts:",
          JSON.stringify(
            blueskyAccounts.map((acc) => ({
              id: acc.id,
              name: acc.name,
              email: acc.email,
              platformId: acc.platformId || "missing",
              accessToken: acc.accessToken ? "exists" : "missing",
              refreshToken: acc.refreshToken ? "exists" : "missing",
            })),
            null,
            2
          )
        );
      }
    }

    // Validate required fields
    if (!postData) {
      console.log("API Route: Missing post data");
      return NextResponse.json(
        { error: "Post data is required" },
        { status: 400 }
      );
    }

    // Extract and validate post content
    const { contentType, text, media, accounts, captions, schedule } = postData;
    console.log("API Route: Extracted post content fields");

    // Validate content type and content
    if (!contentType) {
      console.log("API Route: Missing content type");
      return NextResponse.json(
        { error: "Content type is required" },
        { status: 400 }
      );
    }

    if (contentType === "text" && !text) {
      console.log("API Route: Missing text content for text post");
      return NextResponse.json(
        { error: "Text content is required for text posts" },
        { status: 400 }
      );
    }

    if (contentType === "media" && (!media || media.length === 0)) {
      console.log("API Route: Missing media for media post");
      return NextResponse.json(
        { error: "Media files are required for media posts" },
        { status: 400 }
      );
    }

    // Validate accounts
    if (!accounts || accounts.length === 0) {
      console.log("API Route: No accounts specified");
      return NextResponse.json(
        { error: "At least one account is required" },
        { status: 400 }
      );
    }

    console.log(
      "API Route: Processing accounts:",
      JSON.stringify(accounts.map((a) => ({ id: a.id, type: a.type })))
    );

    // Ensure database connection
    try {
      await ensureDbConnection();
      console.log("API Route: Database connection established");
    } catch (dbConnError) {
      console.error("API Route: Database connection error:", dbConnError);
      return NextResponse.json(
        { error: `Database connection error: ${dbConnError.message}` },
        { status: 500 }
      );
    }

    // Check Post model is available
    if (!Post) {
      console.error("API Route: Post model is not available");
      return NextResponse.json(
        { error: "Database model initialization error" },
        { status: 500 }
      );
    }

    // Construct Post object for the database
    console.log("API Route: Constructing post document");
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
    console.log("API Route: Creating post document in database");
    let savedPost;
    try {
      savedPost = await Post.create(postDocument);
      console.log(
        "API Route: Post created in database with ID:",
        savedPost._id.toString()
      );
    } catch (dbError) {
      console.error("API Route: Database error creating post:", dbError);
      return NextResponse.json(
        { error: `Database error creating post: ${dbError.message}` },
        { status: 500 }
      );
    }

    // Extract platform/account targets
    const targets = accounts.map((account) => ({
      platform: account.type,
      account: account,
    }));
    console.log(
      "API Route: Extracted targets:",
      targets.map((t) => t.platform).join(", ")
    );

    // Prepare response variable
    let results;

    // Process based on schedule type
    if (schedule?.type === "scheduled" && schedule?.at) {
      console.log(
        "API Route: Scheduling post for later at:",
        new Date(schedule.at).toISOString()
      );
      // Schedule the post for later publication
      try {
        results = await Promise.all(
          targets.map(({ platform, account }) =>
            apiManager.schedulePost(
              platform,
              account,
              {
                postId: savedPost._id.toString(),
                contentType: contentType,
                text: text || "",
                media: media || [],
                captions,
              },
              new Date(schedule.at)
            )
          )
        );
        console.log("API Route: Post scheduled successfully");

        // Update post status
        savedPost.status = "scheduled";
        await savedPost.save();
      } catch (scheduleError) {
        console.error("API Route: Error scheduling post:", scheduleError);
        // Update post status to reflect error
        savedPost.status = "failed";
        savedPost.errorMessage = scheduleError.message;
        await savedPost.save();

        return NextResponse.json(
          { error: `Error scheduling post: ${scheduleError.message}` },
          { status: 500 }
        );
      }
    } else {
      console.log("API Route: Posting immediately to platforms");
      // Post immediately
      console.log(
        "API Route: Post data being sent to apiManager:",
        JSON.stringify(
          {
            postId: savedPost._id.toString(),
            contentType: contentType,
            text: text || "",
            mediaCount: media ? media.length : 0,
            captions: {
              mode: captions?.mode,
              hasSingle: !!captions?.single,
              hasMultiple:
                !!captions?.multipleCaptions &&
                Object.keys(captions.multipleCaptions).length > 0,
            },
          },
          null,
          2
        )
      );

      try {
        results = await apiManager.postToMultiplePlatforms(targets, {
          postId: savedPost._id.toString(),
          contentType: contentType,
          text: text || "",
          media: media || [],
          captions,
        });
        console.log(
          "API Route: Post results:",
          JSON.stringify(results, null, 2)
        );

        // Update post status based on results
        const allSucceeded = results.every((result) => result.success);
        savedPost.status = allSucceeded ? "published" : "failed";
        savedPost.results = results;
        await savedPost.save();
      } catch (postError) {
        console.error(
          "API Route: Error in apiManager.postToMultiplePlatforms:",
          postError
        );
        console.error("Error stack:", postError.stack);

        // Update post status to reflect error
        savedPost.status = "failed";
        savedPost.errorMessage = postError.message;
        await savedPost.save();

        return NextResponse.json(
          {
            error: `Error posting to platforms: ${postError.message}`,
            stack: postError.stack,
          },
          { status: 500 }
        );
      }
    }

    // Return the post with results
    console.log("API Route: Successfully completed post submission");
    return NextResponse.json({
      success: true,
      post: savedPost,
      results,
    });
  } catch (error) {
    console.error("API Route: Unhandled error in POST handler:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      {
        error: error.message || "Failed to submit post",
        stack: error.stack,
        name: error.name,
        code: error.code,
      },
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

    console.log("API Route: Connecting to MongoDB...");
    try {
      await mongoose.connect(MONGODB_URI);
      console.log("API Route: Connected to MongoDB");
    } catch (error) {
      console.error("API Route: MongoDB connection error:", error);
      throw error;
    }
  } else {
    console.log("API Route: Already connected to MongoDB");
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
