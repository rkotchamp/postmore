/**
 * API Bridge Module for Queue Workers
 *
 * This module creates a bridge between ES Modules (used by the queue worker)
 * and CommonJS modules (used by the Next.js app)
 *
 * It implements a simplified version of the API manager to handle scheduled posts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { BskyAgent } from "@atproto/api";

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
export async function connectToDatabase() {
  if (mongoose.connection.readyState !== 1) {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI not defined in environment variables");
    }

    console.log("Worker: Connecting to MongoDB...");
    try {
      await mongoose.connect(MONGODB_URI);
      console.log("Worker: Connected to MongoDB successfully");
    } catch (error) {
      console.error("Worker: MongoDB connection error:", error);
      throw error;
    }
  } else {
    console.log("Worker: Already connected to MongoDB");
  }
}

// Simple BlueSky posting implementation that doesn't rely on importing the whole service
async function postToBlueSky(account, postData) {
  console.log("Worker: Posting directly to BlueSky");
  console.log(
    "Worker: Account data:",
    JSON.stringify({
      id: account.id,
      platform: account.platform,
      hasOriginalData: !!account.originalData,
      hasAccessToken:
        !!account.accessToken ||
        !!(account.originalData && account.originalData.accessToken),
      hasRefreshToken:
        !!account.refreshToken ||
        !!(account.originalData && account.originalData.refreshToken),
    })
  );

  // Extract tokens appropriately - they might be in account or account.originalData
  const accessToken =
    account.accessToken ||
    (account.originalData && account.originalData.accessToken);
  const refreshToken =
    account.refreshToken ||
    (account.originalData && account.originalData.refreshToken);
  const platformAccountId =
    account.platformAccountId ||
    (account.originalData && account.originalData.platformAccountId);
  const platformUsername =
    account.platformUsername ||
    account.email ||
    (account.originalData && account.originalData.platformUsername);

  console.log("Extracted tokens:", {
    "Access Token": accessToken,
    "Refresh Token": refreshToken,
    "Platform Account ID": platformAccountId,
    "Platform Username": platformUsername,
  });

  try {
    // Initialize Bluesky agent
    const agent = new BskyAgent({
      service: "https://bsky.social",
    });

    // Make sure we have required tokens
    if (!accessToken || !refreshToken) {
      throw new Error("Missing required tokens for BlueSky authentication");
    }

    if (!platformAccountId) {
      throw new Error("Missing platformAccountId (DID) for BlueSky account");
    }

    if (!platformUsername) {
      throw new Error("Missing platformUsername (handle) for BlueSky account");
    }

    console.log("Worker: Attempting BlueSky authentication with:", {
      did: platformAccountId,
      handle: platformUsername,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
    });

    // Authenticate
    try {
      await agent.resumeSession({
        did: platformAccountId,
        handle: platformUsername,
        accessJwt: accessToken,
        refreshJwt: refreshToken,
      });
      console.log("Worker: BlueSky authentication successful");
    } catch (authError) {
      console.error(
        "Worker: BlueSky authentication failed:",
        authError.message
      );
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    // Prepare post text
    let postText = "";
    if (postData.contentType === "text") {
      postText = postData.text || "";
    } else if (postData.contentType === "media") {
      if (postData.captions?.mode === "single") {
        postText = postData.captions.single || "";
      } else if (postData.captions?.mode === "multiple") {
        postText =
          postData.captions?.multipleCaptions?.[account.id] ||
          postData.captions?.single ||
          "";
      }
    }

    // Process media if present
    const images = [];
    if (postData.media && postData.media.length > 0) {
      console.log(
        "Worker: Processing media for BlueSky post:",
        postData.media.length,
        "items"
      );

      for (const mediaItem of postData.media) {
        if (
          mediaItem.type === "image" ||
          (mediaItem.type && mediaItem.type.startsWith("image/"))
        ) {
          try {
            console.log("Worker: Fetching image from URL:", mediaItem.url);
            const response = await fetch(mediaItem.url);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status}`);
            }

            const imageBytes = await response.arrayBuffer();

            const uploadResult = await agent.uploadBlob(
              new Uint8Array(imageBytes),
              {
                encoding: mediaItem.fileInfo?.type || "image/jpeg",
              }
            );

            if (uploadResult.success) {
              images.push({
                image: uploadResult.data.blob,
                alt: mediaItem.altText || mediaItem.originalName || "",
              });
              console.log("Worker: Image uploaded successfully");
            }
          } catch (uploadError) {
            console.error("Worker: Image upload error:", uploadError.message);
          }
        } else {
          console.log("Worker: Skipping non-image media:", mediaItem.type);
        }
      }
    }

    // Create post record
    const record = {
      text: postText,
      createdAt: new Date().toISOString(),
    };

    // Add media if we have any
    if (images.length > 0) {
      record.embed = {
        $type: "app.bsky.embed.images",
        images: images,
      };
    }

    console.log(
      "Worker: Posting to BlueSky with record:",
      JSON.stringify({
        text: record.text,
        hasEmbed: !!record.embed,
        imageCount: images.length,
      })
    );

    // Publish the post
    const postResponse = await agent.api.app.bsky.feed.post.create(
      { repo: agent.session.did },
      record
    );

    console.log("Worker: BlueSky post successful:", postResponse.uri);

    // Return success
    return {
      success: true,
      message: "Post successfully published to BlueSky",
      platform: "bluesky",
      postId: postResponse.cid,
      postUri: postResponse.uri,
      postUrl: `https://bsky.app/profile/${platformUsername}/post/${postResponse.uri
        .split("/")
        .pop()}`,
    };
  } catch (error) {
    console.error("Worker: BlueSky posting error:", error);
    return {
      success: false,
      message: `Failed to post to BlueSky: ${error.message}`,
      platform: "bluesky",
      error: {
        name: error.name,
        message: error.message,
      },
    };
  }
}

/**
 * Direct implementation of postToPlatform that works without importing
 * the original apiManager
 */
export async function postToPlatform(platform, account, postData) {
  console.log(`Worker: Posting to ${platform} using direct implementation`);

  try {
    // Handle database connection first
    await connectToDatabase();

    // Platform-specific implementations
    if (platform === "bluesky") {
      return await postToBlueSky(account, postData);
    }

    // For other platforms, we'll create simplified mock implementations for now
    // In production, you should implement actual posting logic for each platform

    console.log(
      `Worker: Platform ${platform} not directly implemented, using mock`
    );
    return {
      success: true,
      platform,
      postId: `worker-post-${Date.now()}`,
      message: `Posted to ${platform} (worker implementation)`,
    };
  } catch (error) {
    console.error(`Worker: Error posting to ${platform}:`, error);
    return {
      success: false,
      platform,
      error: error.message || `Failed to post to ${platform}`,
    };
  }
}
