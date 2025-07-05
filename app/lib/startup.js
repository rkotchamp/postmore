/**
 * Application startup script
 * Initializes queues, scheduled jobs, and other background services
 */

import { initPostQueue } from "./queues/postQueue";
import { initTokenRefreshQueue } from "./queues/tokenRefreshQueue";
import { initializeScheduledJobs } from "./queues/setupScheduledJobs";
import registerQueues from "./queues/registerQueues.mjs";
import registerWorkers from "./queues/registerWorkers.mjs";

// A flag to track if the app has been initialized
let isInitialized = false;

/**
 * Initialize the application
 * This should be called once during app startup
 */
export async function initializeApp() {
  // Prevent multiple initializations
  if (isInitialized) {
    console.log("App already initialized, skipping");
    return;
  }

  try {
    console.log("Initializing application...");

    // Initialize existing queue systems
    initPostQueue();
    initTokenRefreshQueue();

    // Initialize new queue and worker system
    await registerQueues();
    registerWorkers();

    // Set up scheduled jobs
    await initializeScheduledJobs();

    console.log("Application initialization completed successfully");
    isInitialized = true;
  } catch (error) {
    console.error("Failed to initialize application:", error);
    // Continue app startup even if initialization fails
    // This allows the application to still function even if background jobs fail
  }
}

export default initializeApp;
