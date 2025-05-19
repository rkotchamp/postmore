/**
 * Post Queue Setup - Worker Compatible Version (.mjs)
 * Handles scheduling and processing of posts using BullMQ
 */

import { Queue } from "bullmq";
import path from "path";
import { fileURLToPath } from "url";
import { connectToDatabase, postToPlatform } from "./api-bridge.mjs";

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up paths for absolute imports
const appRoot = path.resolve(__dirname, "../../..");

// Import the real apiManager (dynamically to avoid ES Module issues)
import("../api/services/apiManager.js")
  .then((module) => {
    globalThis.realApiManager = module.apiManager;
    console.log("Real API Manager imported successfully");
  })
  .catch((err) => {
    console.error("Failed to import real API Manager:", err);
  });

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
};

// Create a queue for posts
let postQueue;

/**
 * Initialize the post queue
 * This should be called once at startup
 */
export function initPostQueue() {
  if (!postQueue) {
    try {
      postQueue = new Queue("posts", {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: 1000, // Keep last 1000 failed jobs
        },
      });
      console.log("Post queue initialized");
    } catch (error) {
      console.error("Failed to initialize post queue:", error);
      throw error;
    }
  }

  return postQueue;
}

/**
 * Get the post queue instance
 * Initializes the queue if it doesn't exist
 */
export function getPostQueue() {
  if (!postQueue) {
    return initPostQueue();
  }
  return postQueue;
}

/**
 * Add a post to the queue for processing
 *
 * @param {object} postData - Data for the post (user, account, content)
 * @param {Date} scheduledAt - When the post should be processed
 * @returns {Promise<string>} - The ID of the created job
 */
export async function addPostToQueue(postData, scheduledAt) {
  const queue = getPostQueue();

  // Format the job data
  const jobData = {
    userId: postData.userId,
    platform: postData.account.platform,
    accountData: postData.account,
    content: postData.content,
    createdAt: new Date().toISOString(),
  };

  // Calculate the delay in milliseconds
  const now = new Date();
  const delay = Math.max(0, scheduledAt.getTime() - now.getTime());

  // Add the job to the queue
  try {
    const job = await queue.add("process-post", jobData, {
      delay,
      jobId: `post-${postData.userId}-${postData.account.id}-${now.getTime()}`,
    });

    console.log(
      `Post added to queue with ID ${job.id}, scheduled for ${scheduledAt}`
    );

    return job.id;
  } catch (error) {
    console.error("Failed to add post to queue:", error);
    throw error;
  }
}

/**
 * Process a post job
 * This is used by the worker process to handle jobs from the queue
 *
 * @param {object} jobData - The data for the job
 * @returns {Promise<object>} - The result of posting
 */
export async function processPostJob(jobData) {
  const { platform, accountData, content } = jobData;

  console.log(
    `Processing post job for platform: ${platform}, account: ${
      accountData.id || accountData._id
    }`
  );

  try {
    // Ensure we're connected to the database
    await connectToDatabase();

    // Use the direct implementation from api-bridge.mjs
    const result = await postToPlatform(platform, accountData, content);

    console.log(`Post processed successfully for ${platform}:`, result);

    return result;
  } catch (error) {
    console.error(`Error processing post for ${platform}:`, error);
    throw error;
  }
}

export default {
  initPostQueue,
  getPostQueue,
  addPostToQueue,
  processPostJob,
};
