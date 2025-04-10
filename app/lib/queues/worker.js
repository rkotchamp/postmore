/**
 * Worker Process for Post Queue
 * Handles processing of scheduled posts
 *
 * Note: This would be run as a separate Node.js process in production
 * For example, using PM2 or a similar process manager
 */

import { Worker } from "bullmq";
import { processPostJob } from "./postQueue";

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
};

// Create a worker for the posts queue
function startWorker() {
  console.log("Starting post queue worker...");

  const worker = new Worker(
    "posts",
    async (job) => {
      console.log(`Worker processing job ${job.id}`, job.data);

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
  worker.on("completed", (job) => {
    console.log(`Job ${job.id} has completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`Job ${job.id} has failed with error:`, error);
    // You could implement additional error handling here
    // For example, sending notifications or logging to a monitoring system
  });

  worker.on("error", (error) => {
    console.error("Worker error:", error);
  });

  console.log("Post queue worker started successfully");

  return worker;
}

// If this file is run directly (not imported), start the worker
if (require.main === module) {
  startWorker();
}

export default startWorker;
