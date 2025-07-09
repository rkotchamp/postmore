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
import { connectToMongoose } from "../db/mongoose.js";
import Post from "../../models/PostSchema.js";

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
    await connectToMongoose();

    if (result.success) {
      // Update post to published status and add result
      await Post.findOneAndUpdate(
        { userId: jobData.userId, status: "scheduled" },
        {
          status: "published",
          updatedAt: new Date(),
          $push: {
            results: {
              platform: result.platform,
              accountId: jobData.accountData.id || jobData.accountData._id,
              success: true,
              postId: result.postId,
              url: result.postUrl,
              timestamp: new Date(),
            },
          },
        }
      );
      console.log(`Post ${jobId} marked as published on ${result.platform}`);
    } else {
      // Update post to failed status and add error result
      await Post.findOneAndUpdate(
        { userId: jobData.userId, status: "scheduled" },
        {
          status: "failed",
          updatedAt: new Date(),
          $push: {
            results: {
              platform: result.platform,
              accountId: jobData.accountData.id || jobData.accountData._id,
              success: false,
              error: result.message || result.error?.message || "Unknown error",
              timestamp: new Date(),
            },
          },
        }
      );
      console.log(`Post ${jobId} marked as failed: ${result.message}`);
    }
  } catch (error) {
    console.error(`Error updating post status for job ${jobId}:`, error);
  }
}

// Create workers for the posts and token refresh queues
function startWorkers() {
  console.log("Starting queue workers...");

  // Start the posts worker
  const postWorker = createPostWorker();

  // Start the token refresh worker
  const tokenRefreshWorker = createTokenRefreshWorker();

  console.log("Queue workers started successfully");

  return { postWorker, tokenRefreshWorker };
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

function setupWorkerEventHandlers(worker, workerType) {
  worker.on("completed", async (job) => {
    console.log(`${workerType} job ${job.id} has completed`);

    // Update database for post jobs
    if (workerType === "Post" && job.returnvalue) {
      await updatePostStatus(job.id, job.returnvalue, job.data);
    }
  });

  worker.on("failed", async (job, error) => {
    console.error(`${workerType} job ${job.id} has failed with error:`, error);

    // Update database for post jobs
    if (workerType === "Post") {
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
    console.error(`${workerType} worker error:`, error);
  });
}

// If this file is run directly (not imported), start the workers
if (require.main === module) {
  startWorkers();
}

export default startWorkers;
