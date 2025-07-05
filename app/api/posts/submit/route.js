import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import mongoose from "mongoose";
import { apiManager } from "@/app/lib/api/services/apiManager";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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
  let session; // Declare session at a higher scope

  try {
    // Check authentication
    try {
      session = await getServerSession(authOptions);

      if (!session || !session.user || !session.user.id) {
        return NextResponse.json(
          { error: "Authentication required: Valid user session not found." },
          { status: 401 }
        );
      }
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
        (account) => account.platform === "bluesky"
      );
    }

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
      console.log("API Route: No accounts specified");
      return NextResponse.json(
        { error: "At least one account is required" },
        { status: 400 }
      );
    }

    // Ensure database connection
    try {
      await ensureDbConnection();
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

    // Helper function to map MIME types to schema-defined media types
    const getSchemaMediaType = (mimeType) => {
      if (!mimeType) return undefined; // Or a default type if appropriate
      if (mimeType.startsWith("image/")) return "image";
      if (mimeType.startsWith("video/")) return "video";
      if (mimeType === "image/gif") return "gif";
      return undefined; // Or handle as an unknown/unsupported type
    };

    const postDocument = {
      userId: session.user.id,
      contentType,
      text: text || "",
      media: media
        ? media.map((item) => ({
            ...item,
            id: item.id || new mongoose.Types.ObjectId().toString(), // Ensure ID exists
            type: getSchemaMediaType(item.type), // Map to schema enum type
            url: item.url, // Ensure URL is present
            thumbnail: item.thumbnail || null, // Add thumbnail URL for videos
          }))
        : [],
      accounts: accounts.map((account) => ({
        id: account.id,
        name: account.name,
        email: account.email,
        type: (account.platform || "").toLowerCase(), // Normalize to lowercase
        platformAccountId:
          account.originalData?.platformAccountId ||
          account.platformId ||
          account.id,
      })),
      captions: captions
        ? {
            mode: captions.mode || "single",
            single: captions.single || "",
            // Ensure multiple captions are properly formatted for MongoDB's Map type
            multiple:
              captions.mode === "multiple" && captions.multiple
                ? // Convert the object to a proper Map format that MongoDB expects
                  Object.fromEntries(
                    Object.entries(captions.multiple).map(([key, value]) => [
                      key,
                      value,
                    ])
                  )
                : {},
          }
        : {
            mode: "single",
            single: text || "",
            multiple: {},
          },
      // Adjust schedule type to match schema enum
      schedule: schedule
        ? {
            ...schedule,
            type: schedule.type === "immediate" ? "now" : schedule.type,
          }
        : { type: "now" },
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(
      "API Route: Final postDocument before Post.create:",
      JSON.stringify(postDocument, null, 2)
    );

    // Add specific logging for captions
    if (
      postDocument.captions.mode === "multiple" &&
      postDocument.captions.multiple
    ) {
      console.log(
        "API Route: Multiple captions data:",
        JSON.stringify(postDocument.captions.multiple, null, 2)
      );
      console.log(
        "API Route: Multiple captions keys:",
        Object.keys(postDocument.captions.multiple)
      );
    }

    // Create a new post document in the database

    let savedPost;
    try {
      savedPost = await Post.create(postDocument);
    } catch (dbError) {
      console.error("API Route: Database error creating post:", dbError);
      return NextResponse.json(
        { error: `Database error creating post: ${dbError.message}` },
        { status: 500 }
      );
    }

    // Extract platform/account targets
    const targets = accounts.map((account) => ({
      platform: account.platform,
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
        console.log(
          "API Route: Data sent to apiManager.schedulePost - Targets:",
          JSON.stringify(targets, null, 2)
        );
        const schedulePostData = {
          userId: session.user.id,
          postId: savedPost._id.toString(),
          contentType: contentType,
          text: text || "",
          media: media || [],
          captions,
        };
        console.log(
          "API Route: Data sent to apiManager.schedulePost - Post Data:",
          JSON.stringify(schedulePostData, null, 2)
        );
        results = await Promise.all(
          targets.map(({ platform, account }) =>
            apiManager.schedulePost(
              platform,
              account,
              schedulePostData,
              new Date(schedule.at)
            )
          )
        );
        console.log("API Route: Post scheduled successfully");

        // Check if any platform used native scheduling (like YouTube)
        const hasNativeScheduling = results.some((r) => r.nativeScheduling);

        // Update post status
        savedPost.status = "scheduled";

        // Store the scheduling results
        savedPost.results = results.map((result) => ({
          platform: result.platform,
          accountId: result.accountId,
          success: result.success,
          postId: result.result?.videoId || result.jobId || null,
          url: result.result?.url || null,
          error: result.error || null,
          nativeScheduling: !!result.nativeScheduling,
          scheduledTime: result.scheduledTime
            ? new Date(result.scheduledTime)
            : null,
          timestamp: new Date(),
        }));

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
      const immediatePostData = {
        userId: session.user.id,
        postId: savedPost._id.toString(),
        contentType: contentType,
        text: text || "",
        media: media || [],
        captions,
      };
      console.log(
        "API Route: Post data being sent to apiManager.postToMultiplePlatforms - Targets:",
        JSON.stringify(targets, null, 2)
      );
      console.log(
        "API Route: Post data being sent to apiManager.postToMultiplePlatforms - Post Data:",
        JSON.stringify(immediatePostData, null, 2)
      );

      try {
        results = await apiManager.postToMultiplePlatforms(
          targets,
          immediatePostData
        );
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
  return captions.multiple?.[accountId] || captions.single || "";
}
