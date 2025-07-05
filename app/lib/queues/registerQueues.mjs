/**
 * Queue Registration Module
 * Initializes and registers all BullMQ queues
 */

import { Queue } from "bullmq";
import { connectToDatabase } from "./api-bridge.mjs";

// Import queue modules
import {
  initYoutubeTokenRefreshQueue,
  scheduleRegularYoutubeTokenRefreshes,
} from "./youtubeQueues/youtubeTokenRefreshQueue.mjs";

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
};

// Initialize all queues
export default async function registerQueues() {
  try {
    console.log("Registering and initializing all queues...");

    // Ensure database connection
    await connectToDatabase();

    // Initialize YouTube token refresh queue
    try {
      const youtubeQueue = initYoutubeTokenRefreshQueue();
      console.log("YouTube token refresh queue initialized");

      // Schedule regular token refreshes
      await scheduleRegularYoutubeTokenRefreshes();
      console.log("Regular YouTube token refreshes scheduled");
    } catch (youtubeError) {
      console.error(
        "Failed to initialize YouTube token refresh queue:",
        youtubeError
      );
    }

    console.log("All queues registered successfully");
    return true;
  } catch (error) {
    console.error("Error registering queues:", error);
    return false;
  }
}
