/**
 * Set up scheduled jobs
 * This file initializes the scheduled jobs like token refreshes
 */

import { scheduleRegularTokenRefreshes } from "./tokenRefreshQueue";
import { connectToMongoose } from "@/app/lib/db/mongoose";

/**
 * Initialize all scheduled jobs
 * Should be called during app startup
 */
export async function initializeScheduledJobs() {
  try {
    console.log("Initializing scheduled jobs...");

    // Ensure database connection
    await connectToMongoose();

    // Schedule weekly token refreshes
    const refreshJobId = await scheduleRegularTokenRefreshes();
    console.log(
      `Scheduled weekly token refreshes with job ID: ${refreshJobId}`
    );

    // Add more scheduled jobs here as needed

    console.log("All scheduled jobs have been initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize scheduled jobs:", error);
    throw error;
  }
}

export default initializeScheduledJobs;
