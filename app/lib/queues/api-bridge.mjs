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

// Constants for video handling
const MAX_VIDEO_SIZE_BYTES = 100000000; // 100MB

/**
 * Upload a video to Bluesky - Simplified version for worker
 * @param {BskyAgent} agent - Authenticated Bluesky agent
 * @param {string} videoUrl - URL to the video file
 * @param {object} mediaItem - Metadata about the video
 * @param {File|null} thumbnail - Thumbnail image for the video
 * @returns {Promise<object>} Result of the upload operation
 */
async function uploadVideo(agent, videoUrl, mediaItem) {
  console.log(
    `Worker: Uploading video ${mediaItem.originalName}, type: ${
      mediaItem.type || "unknown"
    }`
  );

  try {
    // Fetch the video file from the URL
    console.log(
      `Worker: Fetching video file from URL: ${
        videoUrl
          ? videoUrl.substring(0, 60) + "..."
          : "No URL, using file directly"
      }`
    );

    let videoBytes;

    try {
      if (videoUrl) {
        const response = await fetch(videoUrl);
        if (!response.ok) {
          throw new Error(
            `Fetch failed: ${response.status} - ${response.statusText}`
          );
        }

        const contentType = response.headers.get("content-type");
        console.log(`Worker: Video content-type from server: ${contentType}`);

        // Save content-type for later use
        mediaItem.serverContentType = contentType;

        videoBytes = await response.arrayBuffer();
        console.log(
          `Worker: Fetched ${videoBytes.byteLength} bytes for video ${mediaItem.originalName}`
        );
      } else {
        throw new Error("No video URL provided");
      }
    } catch (fetchError) {
      console.error(`Worker: Error fetching video: ${fetchError.message}`);
      throw fetchError;
    }

    // Validate video size
    if (videoBytes.byteLength > MAX_VIDEO_SIZE_BYTES) {
      console.error(
        `Worker: Video exceeds size limit (${videoBytes.byteLength} > ${MAX_VIDEO_SIZE_BYTES})`
      );
      return {
        success: false,
        error: `Video exceeds Bluesky's ${
          MAX_VIDEO_SIZE_BYTES / 1000000
        }MB size limit`,
      };
    }

    // Use the agent's XRPC client to call the endpoint directly
    const finalMediaType =
      mediaItem.type || mediaItem.serverContentType || "video/mp4";
    console.log(`Worker: Uploading blob with MIME type: ${finalMediaType}`);

    const uploadResponse = await agent.api.com.atproto.repo.uploadBlob(
      new Uint8Array(videoBytes),
      { encoding: finalMediaType }
    );

    console.log("Worker: Upload blob successful:", {
      success: !!uploadResponse,
      hasBlob: !!uploadResponse?.data?.blob,
      blobRef: uploadResponse?.data?.blob?.ref || "missing",
      blobSize: uploadResponse?.data?.blob?.size || 0,
      blobType: uploadResponse?.data?.blob?.mimeType || "unknown",
    });

    // Return the upload result
    return {
      success: true,
      blob: uploadResponse.data.blob,
      originalSize: videoBytes.byteLength,
    };
  } catch (error) {
    console.error(`Worker: Video upload error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
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
          postData.captions?.multiple?.[account.id] ||
          postData.captions?.single ||
          "";
      }
    }

    // Process media if present
    const images = [];
    let videoEmbed = null;

    if (postData.media && postData.media.length > 0) {
      console.log(
        "Worker: Processing media for BlueSky post:",
        postData.media.length,
        "items"
      );

      for (const mediaItem of postData.media) {
        // Check if it's an image
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
        }
        // Check if it's a video - only process one video per post
        else if (
          (mediaItem.type &&
            (mediaItem.type.startsWith("video/") ||
              mediaItem.type.includes("video") ||
              mediaItem.type === "video/quicktime" ||
              mediaItem.type === "video/mp4")) ||
          (mediaItem.originalName &&
            (mediaItem.originalName.toLowerCase().endsWith(".mp4") ||
              mediaItem.originalName.toLowerCase().endsWith(".mov") ||
              mediaItem.originalName.toLowerCase().endsWith(".webm")))
        ) {
          // Only process one video per post
          if (videoEmbed) {
            console.log(
              "Worker: Skipping additional video, only one allowed per post"
            );
            continue;
          }

          console.log("Worker: Processing video upload for BlueSky");
          try {
            const videoResult = await uploadVideo(
              agent,
              mediaItem.url,
              mediaItem
            );

            if (videoResult.success && videoResult.blob) {
              console.log("Worker: Video upload successful, creating embed");

              videoEmbed = {
                $type: "app.bsky.embed.video",
                video: videoResult.blob,
                alt: mediaItem.altText || mediaItem.originalName || "Video",
              };

              console.log("Worker: Video embed created successfully");
            } else {
              throw new Error(videoResult.error || "Video upload failed");
            }
          } catch (videoError) {
            console.error(`Worker: Video upload error: ${videoError.message}`);
          }
        } else {
          console.log(
            "Worker: Skipping unsupported media type:",
            mediaItem.type
          );
        }
      }
    }

    // Create post record
    const record = {
      text: postText,
      createdAt: new Date().toISOString(),
    };

    // Add media embeds if we have any
    if (images.length > 0 && !videoEmbed) {
      // If we only have images and no video
      record.embed = {
        $type: "app.bsky.embed.images",
        images: images,
      };
    } else if (videoEmbed) {
      // If we have a video, use that as the embed
      record.embed = videoEmbed;
    }

    console.log(
      "Worker: Posting to BlueSky with record:",
      JSON.stringify({
        text: record.text,
        hasEmbed: !!record.embed,
        embedType: record.embed?.$type || "none",
        imageCount: images.length,
        hasVideo: !!videoEmbed,
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
