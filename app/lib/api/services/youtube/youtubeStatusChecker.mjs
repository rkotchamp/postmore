/**
 * YouTube Status Checker
 * Checks if scheduled YouTube videos have been published or failed
 */

import { google } from "googleapis";
import { connectToDatabase } from "../../../queues/api-bridge.mjs";
import mongoose from "mongoose";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const Post = require("../../../../models/PostSchema.js");

// Get SocialAccount model after connection is established
const getSocialAccountModel = () => {
  try {
    return mongoose.model("SocialAccount");
  } catch (error) {
    console.error("Error getting SocialAccount model:", error);
    throw new Error("Failed to get SocialAccount model");
  }
};

/**
 * Check all scheduled YouTube videos and update their status
 */
export async function checkYouTubeScheduledPosts() {
  try {
    console.log("🔍 Checking YouTube scheduled posts...");

    await connectToDatabase();

    // Debug logging removed - system is working correctly

    // Find scheduled YouTube posts within checking window
    const scheduledPosts = await Post.find({
      status: "scheduled",
      "results.platform": "ytShorts",
      $or: [
        // Posts with scheduledTime within checking window
        {
          scheduledTime: {
            $lte: new Date(Date.now() + 30 * 60 * 1000), // Within 30 minutes
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
          },
        },
        // Posts without scheduledTime (fallback for immediate posts)
        {
          scheduledTime: { $exists: false },
        },
        // Posts with null scheduledTime
        {
          scheduledTime: null,
        },
      ],
    });

    console.log(
      `📋 Found ${scheduledPosts.length} scheduled YouTube posts to check`
    );

    for (const post of scheduledPosts) {
      await checkSinglePost(post);
    }

    console.log("✅ YouTube status check completed");
  } catch (error) {
    console.error("❌ Error checking YouTube scheduled posts:", error);
  }
}

/**
 * Check individual post status
 */
async function checkSinglePost(post) {
  try {
    // Get YouTube result from post
    const youtubeResult = post.results?.find((r) => r.platform === "ytShorts");
    if (!youtubeResult?.postId) {
      console.log(`⚠️ No YouTube video ID found for post ${post._id}`);
      return;
    }

    const videoId = youtubeResult.postId;
    console.log(`🔍 Checking video: ${videoId}`);

    // Get user's YouTube account
    const account = await getYouTubeAccount(post.userId);
    if (!account) {
      console.log(`⚠️ No YouTube account found for user ${post.userId}`);
      return;
    }

    // Setup YouTube API client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: account.accessToken,
    });

    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client,
    });

    // Get video status from YouTube API
    const response = await youtube.videos.list({
      part: ["status"],
      id: [videoId],
    });

    const video = response.data.items?.[0];
    if (!video) {
      console.log(`⚠️ Video ${videoId} not found in YouTube API`);
      await updatePostStatus(post, false, "Video not found");
      return;
    }

    const { uploadStatus, privacyStatus, failureReason } = video.status;

    // Determine video status
    const isPublished =
      uploadStatus === "processed" && privacyStatus === "public";
    const hasFailed =
      uploadStatus === "failed" || uploadStatus === "rejected" || failureReason;

    console.log(
      `📊 Video ${videoId} status: upload=${uploadStatus}, privacy=${privacyStatus}`
    );

    if (isPublished) {
      // Video is live and public
      await updatePostStatus(post, true, "Published successfully", videoId);
    } else if (hasFailed) {
      // Video failed to publish
      const errorMessage = failureReason || "Upload failed";
      await updatePostStatus(post, false, errorMessage);
    } else {
      // Still processing or scheduled - no action needed
      console.log(`⏳ Video ${videoId} still processing/scheduled`);
    }
  } catch (error) {
    console.error(`❌ Error checking video for post ${post._id}:`, error);

    // Handle auth errors
    if (error.response?.status === 401) {
      await updatePostStatus(post, false, "Authentication failed");
    }
  }
}

/**
 * Get YouTube account for user
 */
async function getYouTubeAccount(userId) {
  try {
    await connectToDatabase();

    const SocialAccount = getSocialAccountModel();
    const account = await SocialAccount.findOne({
      userId: userId,
      platform: "ytShorts",
      status: "active",
    });

    return account;
  } catch (error) {
    console.error("Error getting YouTube account:", error);
    return null;
  }
}

/**
 * Update post status in database (matches worker.mjs pattern)
 */
async function updatePostStatus(post, success, message, videoId = null) {
  try {
    console.log(
      `🔄 Updating post ${post._id}: ${success ? "published" : "failed"}`
    );

    const updateData = {
      status: success ? "published" : "failed",
      updatedAt: new Date(),
      $push: {
        results: {
          platform: "ytShorts",
          success,
          timestamp: new Date(),
          message,
          ...(success && videoId
            ? {
                postId: videoId,
                url: `https://youtube.com/shorts/${videoId}`,
              }
            : {
                error: message,
              }),
        },
      },
    };

    await Post.findByIdAndUpdate(post._id, updateData);
    console.log(`✅ Post ${post._id} updated successfully`);
  } catch (error) {
    console.error(`❌ Error updating post ${post._id}:`, error);
  }
}
