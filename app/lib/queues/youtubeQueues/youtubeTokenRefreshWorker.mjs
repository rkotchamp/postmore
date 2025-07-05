/**
 * YouTube Token Refresh Worker
 * Processes YouTube token refresh jobs
 */

import { Worker } from "bullmq";
import path from "path";
import { fileURLToPath } from "url";
import {
  processRefreshAllYoutubeTokensJob,
  processRefreshYoutubeAccountTokensJob,
} from "./youtubeTokenRefreshQueue.mjs";

// Path handling for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
};

// Create the worker
const youtubeTokenRefreshWorker = new Worker(
  "youtube-token-refreshes",
  async (job) => {
    console.log(
      `Processing YouTube token refresh job: ${job.name} (${job.id})`
    );

    try {
      switch (job.name) {
        case "refresh-all-youtube-tokens":
          return await processRefreshAllYoutubeTokensJob(job.data);

        case "refresh-youtube-account-tokens":
          return await processRefreshYoutubeAccountTokensJob(job.data);

        default:
          throw new Error(`Unknown job name: ${job.name}`);
      }
    } catch (error) {
      console.error(
        `Error processing YouTube token refresh job ${job.id}:`,
        error
      );
      throw error;
    }
  },
  { connection: redisConnection }
);

// Listen for worker events
youtubeTokenRefreshWorker.on("completed", (job, result) => {
  console.log(`YouTube token refresh job ${job.id} completed`);
});

youtubeTokenRefreshWorker.on("failed", (job, error) => {
  console.error(`YouTube token refresh job ${job.id} failed:`, error);
});

youtubeTokenRefreshWorker.on("error", (error) => {
  console.error("YouTube token refresh worker error:", error);
});

// Export the worker
export default youtubeTokenRefreshWorker;

// If this file is run directly as a script, start the worker
if (
  typeof process !== "undefined" &&
  process.argv[1] === fileURLToPath(import.meta.url)
) {
  console.log("YouTube token refresh worker running in standalone mode");
}
