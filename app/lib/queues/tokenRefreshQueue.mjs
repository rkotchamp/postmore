/**
 * Token Refresh Queue - Worker Compatible Version (.mjs)
 * Handles scheduling and processing of token refreshes using BullMQ
 */

import { Queue } from "bullmq";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { BskyAgent } from "@atproto/api";
import { connectToDatabase } from "./api-bridge.mjs";

// Path handling for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file for direct execution
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

// Import mongoose but use connectToDatabase from api-bridge instead
import mongoose from "mongoose";

// Get SocialAccount model after connection is established
const getSocialAccountModel = () => {
  try {
    return mongoose.model("SocialAccount");
  } catch (error) {
    console.error("Error getting SocialAccount model:", error);
    throw new Error("Failed to get SocialAccount model");
  }
};

// Constants
const BSKY_SERVICE_URL = "https://bsky.social";

// Token refresh locks to prevent concurrent refresh requests for the same account
const tokenRefreshLocks = new Map();

// BlueSky service implementation for token refresh
const blueSkyService = {
  forceRefreshTokens: async (accountId) => {
    try {
      console.log(`BlueSky: Force refreshing tokens for account ${accountId}`);

      // Ensure we're connected to the database using api-bridge
      await connectToDatabase();

      const SocialAccount = getSocialAccountModel();

      // Find the account in the database
      const account = await SocialAccount.findOne({
        _id: accountId,
        platform: "bluesky",
      });

      if (!account) {
        console.error(
          `BlueSky: Account ${accountId} not found for token refresh`
        );
        return {
          success: false,
          message: "Account not found",
          errorCode: "account_not_found",
        };
      }

      console.log(
        `BlueSky: Found account for refresh: ${account.platformUsername}`
      );

      // Check if refresh token exists
      if (!account.refreshToken) {
        console.error(`BlueSky: Account ${accountId} has no refresh token`);
        return {
          success: false,
          message:
            "No refresh token available. Please reconnect your Bluesky account.",
          errorCode: "no_refresh_token",
        };
      }

      // Create a Bluesky agent with correct configuration
      const agent = new BskyAgent({
        service: BSKY_SERVICE_URL,
      });

      // Check if a refresh is already in progress for this account
      const lockId = account.platformAccountId;
      if (tokenRefreshLocks.get(lockId)) {
        try {
          const result = await tokenRefreshLocks.get(lockId);
          return result;
        } catch (error) {
          console.error(
            `BlueSky: Existing refresh failed for ${account.platformUsername}`,
            error
          );
          // Continue with a new refresh attempt
        }
      }

      // Create a promise for this refresh attempt
      let resolveRefreshLock;
      let rejectRefreshLock;
      const refreshPromise = new Promise((resolve, reject) => {
        resolveRefreshLock = resolve;
        rejectRefreshLock = reject;
      });

      // Set the lock
      tokenRefreshLocks.set(lockId, refreshPromise);

      try {
        console.log(
          `BlueSky: Attempting to refresh token for ${account.platformUsername}`
        );

        // Login with the username and refresh token
        const refreshResult = await agent.login({
          identifier: account.platformUsername,
          refreshJwt: account.refreshToken,
        });

        if (!refreshResult) {
          throw new Error("Refresh token request failed");
        }

        const { accessJwt, refreshJwt, did } = refreshResult.data;

        // Verify the did matches
        if (did !== account.platformAccountId) {
          console.error("BlueSky: DID mismatch", {
            receivedDid: did,
            expectedDid: account.platformAccountId,
          });
          throw new Error("DID mismatch after token refresh");
        }

        // Update tokens in database
        const updatedAccount = await SocialAccount.findOneAndUpdate(
          {
            _id: accountId,
            platform: "bluesky",
          },
          {
            $set: {
              accessToken: accessJwt,
              refreshToken: refreshJwt,
              status: "active",
              errorMessage: null,
              tokenExpiry: new Date(Date.now() + 12 * 60 * 60 * 1000), // Set expiry to 12 hours from now
            },
          },
          { new: true }
        );

        if (!updatedAccount) {
          console.error("BlueSky: Database update failed for token refresh");
          throw new Error("Failed to update account in database");
        }

        const result = {
          success: true,
          message: "Bluesky tokens refreshed successfully",
          status: "active",
        };

        // Resolve the promise to unlock any waiting refreshes
        resolveRefreshLock(result);
        return result;
      } catch (error) {
        console.error("BlueSky: Token refresh failed:", error);
        console.error("BlueSky: Error details:", {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
        });

        const SocialAccount = getSocialAccountModel();

        // Update account status to error in database
        try {
          await SocialAccount.findOneAndUpdate(
            {
              _id: accountId,
              platform: "bluesky",
            },
            {
              $set: {
                status: "error",
                errorMessage: `Token refresh failed: ${error.message}`,
              },
            }
          );
        } catch (dbError) {
          console.error("BlueSky: Error updating account status:", dbError);
        }

        // Reject the promise to indicate failure to waiting refreshes
        const errorResult = {
          success: false,
          message: `Failed to refresh tokens: ${error.message}`,
          errorCode: "refresh_error",
          error: {
            name: error.name,
            message: error.message,
          },
        };
        rejectRefreshLock(error);
        return errorResult;
      } finally {
        // After a delay, clear the lock to allow future refresh attempts
        setTimeout(() => {
          if (tokenRefreshLocks.get(lockId) === refreshPromise) {
            tokenRefreshLocks.delete(lockId);
          }
        }, 5000); // 5 second cooldown before allowing another refresh
      }
    } catch (error) {
      console.error("BlueSky: Force refresh error:", error);
      return {
        success: false,
        message: `Failed to refresh tokens: ${error.message}`,
        errorCode: "refresh_error",
        error: {
          name: error.name,
          message: error.message,
        },
      };
    }
  },
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
    // Connect to database using api-bridge
    await connectToDatabase();

    const SocialAccount = getSocialAccountModel();

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
    // Connect to database using api-bridge
    await connectToDatabase();

    // Refresh tokens
    const refreshResult = await blueSkyService.forceRefreshTokens(accountId);

    if (refreshResult.success) {
      console.log(`Successfully refreshed tokens for account ${accountId}`);
      return {
        accountId,
        success: true,
      };
    } else {
      console.error(
        `Failed to refresh tokens for account ${accountId}: ${refreshResult.message}`
      );
      return {
        accountId,
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

// If this file is run directly as a script, initialize and run a test job
if (
  typeof process !== "undefined" &&
  process.argv[1] === fileURLToPath(import.meta.url)
) {
  console.log("Token refresh queue script running in standalone mode");
  console.log("Initializing token refresh queue...");

  (async () => {
    try {
      // Initialize queue
      const queue = initTokenRefreshQueue();

      // Schedule regular refreshes
      const jobId = await scheduleRegularTokenRefreshes();
      console.log(`Scheduled regular token refreshes with job ID ${jobId}`);

      // Trigger an immediate refresh of all tokens
      const immediateJobId = await refreshAllBlueskyTokens();
      console.log(
        `Triggered immediate token refresh with job ID ${immediateJobId}`
      );

      console.log("Token refresh operations completed successfully");
    } catch (error) {
      console.error("Error in token refresh standalone operation:", error);
    }
  })();
}
