/**
 * Worker Process for Post Queue and Token Refresh Queue
 * Handles processing of scheduled posts and token refreshes
 *
 * Note: This would be run as a separate Node.js process in production
 * For example, using PM2 or a similar process manager
 */

import { Worker } from "bullmq";
import { processPostJob } from "./postQueue.js";
import {
  processRefreshAllTokensJob,
  processRefreshAccountTokensJob,
} from "./tokenRefreshQueue.js";

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
};

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
  worker.on("completed", (job) => {
    console.log(`${workerType} job ${job.id} has completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`${workerType} job ${job.id} has failed with error:`, error);
    // You could implement additional error handling here
    // For example, sending notifications or logging to a monitoring system
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
