/**
 * Standalone Worker Process for BullMQ Queues
 *
 * This script is designed to run as a separate Node.js process
 * and process jobs from the post and token refresh queues.
 *
 * It uses relative imports instead of Next.js path aliases,
 * making it compatible with running as a standalone Node.js script.
 */

import { Worker } from "bullmq";
import { processPostJob } from "./postQueue.mjs";
import {
  processRefreshAllTokensJob,
  processRefreshAccountTokensJob,
} from "./tokenRefreshQueue.mjs";

// Load environment variables directly
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
try {
  const envPath = path.resolve(__dirname, "../../../.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const envLines = envContent.split("\n");

    for (const line of envLines) {
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts
          .slice(1)
          .join("=")
          .trim()
          .replace(/^['"](.*)['"]$/, "$1");
        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
    console.log("Environment variables loaded from .env file");
  } else {
    console.log(".env file not found, using existing environment variables");
  }
} catch (error) {
  console.error("Error loading .env file:", error);
}

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

// When this file is run directly, start the workers
startWorkers();
