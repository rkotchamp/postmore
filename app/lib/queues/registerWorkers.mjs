/**
 * Worker Registration Module
 * Initializes and registers all BullMQ workers
 */

// Import YouTube token refresh worker
import youtubeTokenRefreshWorker from "./youtubeQueues/youtubeTokenRefreshWorker.mjs";

// Register all workers
export default function registerWorkers() {
  try {
    console.log("Registering all queue workers...");

    // Register YouTube token refresh worker
    console.log("YouTube token refresh worker registered");

    console.log("All queue workers registered successfully");
    return true;
  } catch (error) {
    console.error("Error registering queue workers:", error);
    return false;
  }
}
