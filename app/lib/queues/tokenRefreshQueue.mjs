/**
 * Token Refresh Queue - Worker Compatible Version (.mjs)
 * Handles scheduling and processing of token refreshes using BullMQ
 */

import { Queue } from "bullmq";

// Mock implementations for standalone mode to avoid CommonJS import issues
// In a real scenario, these would use actual database and API calls

// Mock SocialAccount model
const SocialAccount = {
  find: async (query) => {
    console.log(`[MOCK DB] Finding accounts with query:`, query);
    // Return mock accounts for testing
    return [
      {
        _id: "mock-account-1",
        platform: "bluesky",
        platformUsername: "user1.bsky.social",
        refreshToken: "mock-refresh-token-1",
        status: "active",
      },
      {
        _id: "mock-account-2",
        platform: "bluesky",
        platformUsername: "user2.bsky.social",
        refreshToken: "mock-refresh-token-2",
        status: "active",
      },
    ];
  },
  findById: async (id) => {
    console.log(`[MOCK DB] Finding account with ID: ${id}`);
    // Return a mock account for testing
    return {
      _id: id,
      platform: "bluesky",
      platformUsername: `${id}-user.bsky.social`,
      refreshToken: `mock-refresh-token-${id}`,
      status: "active",
    };
  },
};

// Mock BlueSky service
const blueSkyService = {
  forceRefreshTokens: async (accountId) => {
    console.log(`[MOCK API] Refreshing tokens for account: ${accountId}`);
    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return success most of the time, but occasionally fail for testing
    const success = Math.random() > 0.2;
    return {
      success,
      message: success
        ? "Tokens refreshed successfully"
        : "Failed to refresh tokens",
      accessToken: success
        ? `new-access-token-${accountId}-${Date.now()}`
        : null,
      refreshToken: success
        ? `new-refresh-token-${accountId}-${Date.now()}`
        : null,
    };
  },
};

// Mock database connection
const connectToMongoose = async () => {
  console.log("[MOCK DB] Connected to database");
  return true;
};

// Redis connection configuration (same as post queue)
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
};

// Create a queue for token refreshes
let tokenRefreshQueue;

/**
 * Initialize the token refresh queue
 * This should be called once at startup
 */
export function initTokenRefreshQueue() {
  if (!tokenRefreshQueue) {
    try {
      tokenRefreshQueue = new Queue("token-refreshes", {
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
      console.log("Token refresh queue initialized");
    } catch (error) {
      console.error("Failed to initialize token refresh queue:", error);
      throw error;
    }
  }

  return tokenRefreshQueue;
}

/**
 * Get the token refresh queue instance
 * Initializes the queue if it doesn't exist
 */
export function getTokenRefreshQueue() {
  if (!tokenRefreshQueue) {
    return initTokenRefreshQueue();
  }
  return tokenRefreshQueue;
}

/**
 * Schedule regular token refreshes for all Bluesky accounts
 * This schedules a job to run every week
 */
export async function scheduleRegularTokenRefreshes() {
  const queue = getTokenRefreshQueue();

  // Schedule a job to run every week
  // This cleans up any existing scheduled refresh jobs first
  try {
    // Remove any existing scheduled refresh jobs
    const jobs = await queue.getJobs();
    for (const job of jobs) {
      if (job.name === "refresh-all-tokens" && job.status === "waiting") {
        await job.remove();
      }
    }

    // Add a new job to refresh all tokens
    // This will repeat every 7 days (weekly)
    const job = await queue.add(
      "refresh-all-tokens",
      { scheduled: true },
      {
        jobId: `refresh-all-tokens-${Date.now()}`,
        repeat: {
          pattern: "0 0 * * 0", // Run at midnight every Sunday (cron format)
          limit: 52, // Run for a year (52 weeks) then reschedule
        },
      }
    );

    console.log(`Scheduled regular token refreshes with job ID ${job.id}`);
    return job.id;
  } catch (error) {
    console.error("Failed to schedule token refresh job:", error);
    throw error;
  }
}

/**
 * Add a job to refresh tokens for all Bluesky accounts
 * @returns {Promise<string>} - The ID of the created job
 */
export async function refreshAllBlueskyTokens() {
  const queue = getTokenRefreshQueue();

  try {
    const job = await queue.add(
      "refresh-all-tokens",
      { triggered: true },
      {
        jobId: `refresh-all-tokens-manual-${Date.now()}`,
      }
    );

    console.log(`Added job to refresh all Bluesky tokens with ID ${job.id}`);
    return job.id;
  } catch (error) {
    console.error("Failed to add token refresh job:", error);
    throw error;
  }
}

/**
 * Add a job to refresh tokens for a specific Bluesky account
 * @param {string} accountId - The ID of the account to refresh
 * @returns {Promise<string>} - The ID of the created job
 */
export async function refreshAccountTokens(accountId) {
  const queue = getTokenRefreshQueue();

  try {
    const job = await queue.add(
      "refresh-account-tokens",
      { accountId },
      {
        jobId: `refresh-account-${accountId}-${Date.now()}`,
      }
    );

    console.log(
      `Added job to refresh tokens for account ${accountId} with job ID ${job.id}`
    );
    return job.id;
  } catch (error) {
    console.error(
      `Failed to add token refresh job for account ${accountId}:`,
      error
    );
    throw error;
  }
}

/**
 * Process a refresh all tokens job
 * @param {object} jobData - The data for the job
 * @returns {Promise<object>} - The result of refreshing tokens
 */
export async function processRefreshAllTokensJob(jobData) {
  console.log("Processing job to refresh all Bluesky tokens");

  try {
    // Connect to database
    await connectToMongoose();

    // Get all active Bluesky accounts
    const accounts = await SocialAccount.find({
      platform: "bluesky",
      status: { $ne: "disconnected" },
    });

    console.log(`Found ${accounts.length} Bluesky accounts to refresh`);

    const results = {
      total: accounts.length,
      success: 0,
      failed: 0,
      accounts: [],
    };

    // Process each account
    for (const account of accounts) {
      try {
        console.log(
          `Refreshing tokens for account ${account._id} (${account.platformUsername})`
        );

        // Skip accounts without refresh tokens
        if (!account.refreshToken) {
          console.log(`Account ${account._id} has no refresh token, skipping`);
          results.accounts.push({
            accountId: account._id,
            username: account.platformUsername,
            success: false,
            error: "No refresh token available",
          });
          results.failed++;
          continue;
        }

        // Refresh tokens
        const refreshResult = await blueSkyService.forceRefreshTokens(
          account._id
        );

        if (refreshResult.success) {
          results.success++;
          results.accounts.push({
            accountId: account._id,
            username: account.platformUsername,
            success: true,
          });
        } else {
          results.failed++;
          results.accounts.push({
            accountId: account._id,
            username: account.platformUsername,
            success: false,
            error: refreshResult.message,
          });
        }
      } catch (error) {
        console.error(
          `Error refreshing tokens for account ${account._id}:`,
          error
        );
        results.failed++;
        results.accounts.push({
          accountId: account._id,
          username: account.platformUsername,
          success: false,
          error: error.message,
        });
      }
    }

    console.log(
      `Completed token refresh for all accounts. Success: ${results.success}, Failed: ${results.failed}`
    );
    return results;
  } catch (error) {
    console.error("Error processing refresh all tokens job:", error);
    throw error;
  }
}

/**
 * Process a refresh account tokens job
 * @param {object} jobData - The data for the job with accountId
 * @returns {Promise<object>} - The result of refreshing tokens
 */
export async function processRefreshAccountTokensJob(jobData) {
  const { accountId } = jobData;

  if (!accountId) {
    throw new Error("Missing account ID for token refresh");
  }

  console.log(`Processing job to refresh tokens for account ${accountId}`);

  try {
    // Connect to database
    await connectToMongoose();

    // Get the account
    const account = await SocialAccount.findById(accountId);

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    if (account.platform !== "bluesky") {
      throw new Error(
        `Account ${accountId} is not a Bluesky account (${account.platform})`
      );
    }

    // Skip accounts without refresh tokens
    if (!account.refreshToken) {
      console.log(`Account ${account._id} has no refresh token, skipping`);
      return {
        accountId: account._id,
        username: account.platformUsername,
        success: false,
        error: "No refresh token available",
      };
    }

    // Refresh tokens
    const refreshResult = await blueSkyService.forceRefreshTokens(account._id);

    if (refreshResult.success) {
      console.log(
        `Successfully refreshed tokens for ${account.platformUsername}`
      );
      return {
        accountId: account._id,
        username: account.platformUsername,
        success: true,
      };
    } else {
      console.error(
        `Failed to refresh tokens for ${account.platformUsername}: ${refreshResult.message}`
      );
      return {
        accountId: account._id,
        username: account.platformUsername,
        success: false,
        error: refreshResult.message,
      };
    }
  } catch (error) {
    console.error(`Error processing account token refresh job:`, error);
    throw error;
  }
}

export default {
  initTokenRefreshQueue,
  getTokenRefreshQueue,
  scheduleRegularTokenRefreshes,
  refreshAllBlueskyTokens,
  refreshAccountTokens,
  processRefreshAllTokensJob,
  processRefreshAccountTokensJob,
};
