/**
 * Post Queue Setup - Worker Compatible Version (.mjs)
 * Handles scheduling and processing of posts using BullMQ
 */

import { Queue } from "bullmq";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
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
  const { platform, accountData, content, userId } = jobData;

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

    // Update the database if we have a postId and the post was successful
    if (content.postId && result.success) {
      try {
        // Import Post schema - need to recreate it since we can't import from CommonJS
        const PostSchema = new mongoose.Schema({
          status: {
            type: String,
            enum: ["pending", "scheduled", "published", "failed", "draft"],
            default: "pending",
          },
          results: [{
            platform: String,
            accountId: String,
            success: Boolean,
            postId: String,
            url: String,
            error: String,
            timestamp: {
              type: Date,
              default: Date.now,
            },
          }],
          updatedAt: {
            type: Date,
            default: Date.now,
          }
        }, { strict: false }); // Allow other fields

        const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
        
        // Find the post document and update it
        const updateData = {
          status: 'published',
          updatedAt: new Date(),
          $push: {
            results: {
              platform: platform,
              accountId: accountData.id || accountData._id,
              success: result.success,
              postId: result.postId,
              url: result.postUrl || result.postUri,
              timestamp: new Date(),
              error: result.error || null
            }
          }
        };
        
        const updatedPost = await Post.findByIdAndUpdate(
          content.postId,
          updateData,
          { new: true }
        );
        
        if (updatedPost) {
          console.log(`Worker: Updated post ${content.postId} status to 'published'`);
        } else {
          console.log(`Worker: Could not find post with ID ${content.postId}`);
        }
      } catch (dbError) {
        console.error(`Worker: Failed to update post status in database:`, dbError);
        // Don't throw - the post was successful, just database update failed
      }
    }

    return result;
  } catch (error) {
    console.error(`Error processing post for ${platform}:`, error);
    
    // Update the database to mark as failed if we have a postId
    if (content.postId) {
      try {
        const PostSchema = new mongoose.Schema({
          status: {
            type: String,
            enum: ["pending", "scheduled", "published", "failed", "draft"],
            default: "pending",
          },
          results: [{
            platform: String,
            accountId: String,
            success: Boolean,
            postId: String,
            url: String,
            error: String,
            timestamp: {
              type: Date,
              default: Date.now,
            },
          }],
          updatedAt: {
            type: Date,
            default: Date.now,
          }
        }, { strict: false });

        const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
        
        const updateData = {
          status: 'failed',
          updatedAt: new Date(),
          $push: {
            results: {
              platform: platform,
              accountId: accountData.id || accountData._id,
              success: false,
              error: error.message,
              timestamp: new Date()
            }
          }
        };
        
        await Post.findByIdAndUpdate(content.postId, updateData);
        console.log(`Worker: Updated post ${content.postId} status to 'failed'`);
      } catch (dbError) {
        console.error(`Worker: Failed to update failed post status:`, dbError);
      }
    }
    
    throw error;
  }
}

export default {
  initPostQueue,
  getPostQueue,
  addPostToQueue,
  processPostJob,
};
