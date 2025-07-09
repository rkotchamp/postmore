/**
 * YouTube Polling Queue
 * Handles scheduling and processing of YouTube video status checking
 */

import { Queue } from "bullmq";
import { checkYouTubeScheduledPosts } from "../api/services/youtube/youtubeStatusChecker.mjs";

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
};

let youtubePollingQueue;

/**
 * Initialize YouTube polling queue
 */
export function initYouTubePollingQueue() {
  if (!youtubePollingQueue) {
    try {
      youtubePollingQueue = new Queue("youtube-polling", {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
          removeOnComplete: 50,
          removeOnFail: 20,
        },
      });
      console.log("YouTube polling queue initialized");
    } catch (error) {
      console.error("Failed to initialize YouTube polling queue:", error);
      throw error;
    }
  }
  return youtubePollingQueue;
}

/**
 * Get YouTube polling queue instance
 */
export function getYouTubePollingQueue() {
  if (!youtubePollingQueue) {
    return initYouTubePollingQueue();
  }
  return youtubePollingQueue;
}

/**
 * Schedule regular YouTube polling (every 15 minutes)
 */
export async function scheduleYouTubePolling() {
  const queue = getYouTubePollingQueue();

  try {
    // Remove existing scheduled jobs
    const jobs = await queue.getJobs();
    for (const job of jobs) {
      if (job.name === "check-youtube-status" && job.opts.repeat) {
        await job.remove();
      }
    }

    // Schedule new polling job
    const job = await queue.add(
      "check-youtube-status",
      { scheduled: true },
      {
        jobId: `check-youtube-status-${Date.now()}`,
        repeat: {
          pattern: "*/15 * * * *", // Every 15 minutes
        },
      }
    );

    console.log(`Scheduled YouTube polling with job ID ${job.id}`);
    return job.id;
  } catch (error) {
    console.error("Failed to schedule YouTube polling:", error);
    throw error;
  }
}

/**
 * Manually trigger YouTube polling
 */
export async function triggerYouTubePolling() {
  const queue = getYouTubePollingQueue();

  try {
    const job = await queue.add(
      "check-youtube-status",
      { manual: true },
      {
        jobId: `check-youtube-status-manual-${Date.now()}`,
      }
    );

    console.log(`Triggered manual YouTube polling with job ID ${job.id}`);
    return job.id;
  } catch (error) {
    console.error("Failed to trigger YouTube polling:", error);
    throw error;
  }
}

/**
 * Process YouTube status checking job
 */
export async function processYouTubePollingJob(jobData) {
  console.log("Processing YouTube polling job:", jobData);

  try {
    await checkYouTubeScheduledPosts();

    return {
      success: true,
      message: "YouTube status check completed successfully",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error in YouTube polling job:", error);
    throw error;
  }
}

export default {
  initYouTubePollingQueue,
  getYouTubePollingQueue,
  scheduleYouTubePolling,
  triggerYouTubePolling,
  processYouTubePollingJob,
};
