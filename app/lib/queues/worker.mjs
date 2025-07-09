/**
 * Worker Process for Post Queue and Token Refresh Queue
 * Handles processing of scheduled posts and token refreshes
 *
 * Note: This would be run as a separate Node.js process in production
 * For example, using PM2 or a similar process manager
 */

import { Worker } from "bullmq";
import { processPostJob } from "./postQueue.mjs";
import {
  processRefreshAllTokensJob,
  processRefreshAccountTokensJob,
} from "./tokenRefreshQueue.mjs";
import { processYouTubePollingJob } from "./youtubePollingQueue.mjs";
import { connectToMongoose } from "../db/mongoose.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const Post = require("../../models/PostSchema.js");

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
};

/**
 * Update post status in database based on job result
 */
async function updatePostStatus(jobId, result, jobData) {
  try {
    console.log(`🔄 Updating post status for job ${jobId}`, {
      userId: jobData?.userId,
      platform: result?.platform,
      success: result?.success,
      accountId: jobData?.accountData?.id || jobData?.accountData?._id,
    });

    await connectToMongoose();
    console.log("✅ Connected to MongoDB");

    // First, let's find if there are any posts for this user
    const userPosts = await Post.find({ userId: jobData.userId }).limit(5);
    console.log(
      `📋 Found ${userPosts.length} posts for user ${jobData.userId}`
    );

    // Show the statuses of recent posts
    userPosts.forEach((post) => {
      console.log(
        `📄 Post ${post._id}: status="${post.status}", platform="${post.accounts?.[0]?.type}"`
      );
    });

    const updateData = {
      updatedAt: new Date(),
      $push: {
        results: {
          platform: result.platform,
          accountId: jobData.accountData?.id || jobData.accountData?._id,
          success: result.success,
          timestamp: new Date(),
          ...(result.success
            ? {
                postId: result.postId,
                url: result.postUrl,
              }
            : {
                error:
                  result.message || result.error?.message || "Unknown error",
              }),
        },
      },
    };

    if (result.success) {
      updateData.status = "published";
    } else {
      updateData.status = "failed";
    }

    // Try multiple query approaches
    let updatedPost = null;

    // Approach 1: Find by userId and scheduled status
    updatedPost = await Post.findOneAndUpdate(
      { userId: jobData.userId, status: "scheduled" },
      updateData,
      { new: true }
    );

    if (!updatedPost) {
      console.log("⚠️ No scheduled post found, trying pending status...");
      // Approach 2: Try pending status
      updatedPost = await Post.findOneAndUpdate(
        { userId: jobData.userId, status: "pending" },
        updateData,
        { new: true }
      );
    }

    if (!updatedPost) {
      console.log("⚠️ No pending post found, trying most recent post...");
      // Approach 3: Try the most recent post for this user
      const recentPost = await Post.findOne({ userId: jobData.userId }).sort({
        createdAt: -1,
      });
      if (recentPost) {
        updatedPost = await Post.findByIdAndUpdate(recentPost._id, updateData, {
          new: true,
        });
      }
    }

    if (updatedPost) {
      console.log(`✅ Post ${jobId} updated successfully:`, {
        postId: updatedPost._id,
        status: updatedPost.status,
        platform: result.platform,
        resultsCount: updatedPost.results?.length || 0,
      });
    } else {
      console.error(`❌ Failed to find and update post for job ${jobId}`);
    }
  } catch (error) {
    console.error(`💥 Error updating post status for job ${jobId}:`, error);
  }
}

// Create workers for the posts and token refresh queues
function startWorkers() {
  console.log("Starting queue workers...");

  // Start the posts worker
  const postWorker = createPostWorker();

  // Start the token refresh worker
  const tokenRefreshWorker = createTokenRefreshWorker();

  // Start the YouTube polling worker
  const youtubePollingWorker = createYouTubePollingWorker();

  console.log("Queue workers started successfully");

  return { postWorker, tokenRefreshWorker, youtubePollingWorker };
}

function createPostWorker() {
  console.log("Starting post queue worker...");

  const worker = new Worker(
    "posts",
    async (job) => {
      console.log(`Post worker processing job ${job.id}`, job.data);

      // Process the job
      try {
        const result = await processPostJob(job.data);
        console.log(`Job ${job.id} completed successfully`, result);
        return result;
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 5, // Process up to 5 jobs concurrently
    }
  );

  // Set up event handlers
  setupWorkerEventHandlers(worker, "Post");

  console.log("Post queue worker started successfully");
  return worker;
}

function createTokenRefreshWorker() {
  console.log("Starting token refresh queue worker...");

  const worker = new Worker(
    "token-refreshes",
    async (job) => {
      console.log(`Token refresh worker processing job ${job.id}`, job.data);

      // Process the job based on job name
      try {
        let result;

        if (job.name === "refresh-all-tokens") {
          result = await processRefreshAllTokensJob(job.data);
        } else if (job.name === "refresh-account-tokens") {
          result = await processRefreshAccountTokensJob(job.data);
        } else {
          throw new Error(`Unknown job name: ${job.name}`);
        }

        console.log(`Job ${job.id} completed successfully`);
        return result;
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 2, // Process up to 2 token refresh jobs concurrently
    }
  );

  // Set up event handlers
  setupWorkerEventHandlers(worker, "Token refresh");

  console.log("Token refresh queue worker started successfully");
  return worker;
}

function createYouTubePollingWorker() {
  console.log("Starting YouTube polling queue worker...");

  const worker = new Worker(
    "youtube-polling",
    async (job) => {
      console.log(`YouTube polling worker processing job ${job.id}`, job.data);

      try {
        const result = await processYouTubePollingJob(job.data);
        console.log(`Job ${job.id} completed successfully`, result);
        return result;
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: 1, // Only process one polling job at a time
    }
  );

  // Set up event handlers
  setupWorkerEventHandlers(worker, "YouTube polling");

  console.log("YouTube polling queue worker started successfully");
  return worker;
}

function setupWorkerEventHandlers(worker, workerType) {
  worker.on("completed", async (job) => {
    console.log(`🎉 ${workerType} job ${job.id} has completed`);
    console.log(`📊 Job return value:`, job.returnvalue);
    console.log(`📋 Job data:`, job.data);

    // Update database for post jobs
    if (workerType === "Post") {
      if (job.returnvalue) {
        console.log(`🔄 Starting database update for completed job ${job.id}`);
        await updatePostStatus(job.id, job.returnvalue, job.data);
      } else {
        console.log(`⚠️ No return value found for job ${job.id}`);
      }
    }
  });

  worker.on("failed", async (job, error) => {
    console.error(
      `💥 ${workerType} job ${job.id} has failed with error:`,
      error.message
    );
    console.log(`📋 Failed job data:`, job.data);

    // Update database for post jobs
    if (workerType === "Post") {
      console.log(`🔄 Starting database update for failed job ${job.id}`);
      await updatePostStatus(
        job.id,
        {
          success: false,
          message: error.message || "Job failed",
          platform: job.data?.platform || "unknown",
          error: error,
        },
        job.data
      );
    }
  });

  worker.on("error", (error) => {
    console.error(`🚨 ${workerType} worker error:`, error);
  });

  worker.on("stalled", (jobId) => {
    console.warn(`⏳ ${workerType} job ${jobId} has stalled`);
  });

  worker.on("progress", (job, progress) => {
    console.log(`⏳ ${workerType} job ${job.id} progress: ${progress}%`);
  });
}

// If this file is run directly (not imported), start the workers
if (require.main === module) {
  startWorkers();
}

export default startWorkers;
