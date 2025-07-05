/**
 * YouTube Token Refresh Queue
 * Handles scheduling and processing of YouTube token refreshes using BullMQ
 */

import { Queue } from "bullmq";
import { google } from "googleapis";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { connectToDatabase } from "../api-bridge.mjs";
import mongoose from "mongoose";

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

// Get SocialAccount model after connection is established
const getSocialAccountModel = () => {
  try {
    return mongoose.model("SocialAccount");
  } catch (error) {
    console.error("Error getting SocialAccount model:", error);
    throw new Error("Failed to get SocialAccount model");
  }
};

// Token refresh locks to prevent concurrent refresh requests
const tokenRefreshLocks = new Map();

// YouTube service implementation for token refresh
const youtubeService = {
  refreshTokens: async (accountId) => {
    try {
      console.log(`YouTube: Refreshing tokens for account ${accountId}`);

      // Ensure database connection
      await connectToDatabase();
      const SocialAccount = getSocialAccountModel();

      // Find the account
      const account = await SocialAccount.findOne({
        _id: accountId,
        platform: "ytShorts",
      });

      if (!account) {
        console.error(
          `YouTube: Account ${accountId} not found for token refresh`
        );
        return {
          success: false,
          message: "Account not found",
          errorCode: "account_not_found",
        };
      }

      console.log(
        `YouTube: Found account for refresh: ${
          account.platformUsername || account.name
        }`
      );

      // Check if refresh token exists
      if (!account.refreshToken) {
        console.error(`YouTube: Account ${accountId} has no refresh token`);
        return {
          success: false,
          message:
            "No refresh token available. Please reconnect your YouTube account.",
          errorCode: "no_refresh_token",
        };
      }

      // Check if refresh is already in progress
      const lockId = account.platformAccountId || account._id.toString();
      if (tokenRefreshLocks.get(lockId)) {
        try {
          const result = await tokenRefreshLocks.get(lockId);
          return result;
        } catch (error) {
          console.error(
            `YouTube: Existing refresh failed for ${account.name}`,
            error
          );
          // Continue with new refresh attempt
        }
      }

      // Create promise for this refresh attempt
      let resolveRefreshLock, rejectRefreshLock;
      const refreshPromise = new Promise((resolve, reject) => {
        resolveRefreshLock = resolve;
        rejectRefreshLock = reject;
      });

      // Set the lock
      tokenRefreshLocks.set(lockId, refreshPromise);

      try {
        console.log(`YouTube: Attempting to refresh token for ${account.name}`);

        // Create OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );

        // Set credentials using refresh token
        oauth2Client.setCredentials({
          refresh_token: account.refreshToken,
        });

        // Get new access token
        const { token, res } = await oauth2Client.getAccessToken();

        if (!token) {
          throw new Error("Failed to refresh token");
        }

        // Calculate expiry time from response
        const expiryTime = new Date();
        if (res.data && res.data.expires_in) {
          expiryTime.setSeconds(expiryTime.getSeconds() + res.data.expires_in);
        } else {
          // Default to 1 hour if no expiry provided
          expiryTime.setHours(expiryTime.getHours() + 1);
        }

        // Update tokens in database
        const updatedAccount = await SocialAccount.findOneAndUpdate(
          {
            _id: accountId,
            platform: "ytshorts",
          },
          {
            $set: {
              accessToken: token,
              status: "active",
              errorMessage: null,
              tokenExpiry: expiryTime,
            },
          },
          { new: true }
        );

        if (!updatedAccount) {
          console.error("YouTube: Database update failed for token refresh");
          throw new Error("Failed to update account in database");
        }

        const result = {
          success: true,
          message: "YouTube tokens refreshed successfully",
          status: "active",
          expiryTime,
        };

        // Resolve the promise
        resolveRefreshLock(result);
        return result;
      } catch (error) {
        console.error("YouTube: Token refresh failed:", error);

        // Update account status to error
        try {
          await SocialAccount.findOneAndUpdate(
            {
              _id: accountId,
              platform: "ytshorts",
            },
            {
              $set: {
                status: "error",
                errorMessage: `Token refresh failed: ${error.message}`,
              },
            }
          );
        } catch (dbError) {
          console.error("YouTube: Error updating account status:", dbError);
        }

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
        // Clear the lock after delay
        setTimeout(() => {
          if (tokenRefreshLocks.get(lockId) === refreshPromise) {
            tokenRefreshLocks.delete(lockId);
          }
        }, 5000);
      }
    } catch (error) {
      console.error("YouTube: Token refresh error:", error);
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

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
};

// Create queue
let youtubeTokenRefreshQueue;

export function initYoutubeTokenRefreshQueue() {
  if (!youtubeTokenRefreshQueue) {
    try {
      youtubeTokenRefreshQueue = new Queue("youtube-token-refreshes", {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: 1000,
        },
      });
      console.log("YouTube token refresh queue initialized");
    } catch (error) {
      console.error("Failed to initialize YouTube token refresh queue:", error);
      throw error;
    }
  }

  return youtubeTokenRefreshQueue;
}

export function getYoutubeTokenRefreshQueue() {
  if (!youtubeTokenRefreshQueue) {
    return initYoutubeTokenRefreshQueue();
  }
  return youtubeTokenRefreshQueue;
}

// Schedule regular refreshes for all YouTube accounts
export async function scheduleRegularYoutubeTokenRefreshes() {
  const queue = getYoutubeTokenRefreshQueue();

  try {
    // Remove existing scheduled jobs
    const jobs = await queue.getJobs();
    for (const job of jobs) {
      if (
        job.name === "refresh-all-youtube-tokens" &&
        job.status === "waiting"
      ) {
        await job.remove();
      }
    }

    // Add new job to refresh all tokens weekly
    const job = await queue.add(
      "refresh-all-youtube-tokens",
      { scheduled: true },
      {
        jobId: `refresh-all-youtube-tokens-${Date.now()}`,
        repeat: {
          pattern: "0 0 * * 0", // Midnight every Sunday
          limit: 52, // Run for a year
        },
      }
    );

    console.log(
      `Scheduled regular YouTube token refreshes with job ID ${job.id}`
    );
    return job.id;
  } catch (error) {
    console.error("Failed to schedule YouTube token refresh job:", error);
    throw error;
  }
}

// Add job to refresh tokens for all YouTube accounts
export async function refreshAllYoutubeTokens() {
  const queue = getYoutubeTokenRefreshQueue();

  try {
    const job = await queue.add(
      "refresh-all-youtube-tokens",
      { triggered: true },
      {
        jobId: `refresh-all-youtube-tokens-manual-${Date.now()}`,
      }
    );

    console.log(`Added job to refresh all YouTube tokens with ID ${job.id}`);
    return job.id;
  } catch (error) {
    console.error("Failed to add YouTube token refresh job:", error);
    throw error;
  }
}

// Add job to refresh tokens for a specific YouTube account
export async function refreshYoutubeAccountTokens(accountId) {
  const queue = getYoutubeTokenRefreshQueue();

  try {
    const job = await queue.add(
      "refresh-youtube-account-tokens",
      { accountId },
      {
        jobId: `refresh-youtube-account-${accountId}-${Date.now()}`,
      }
    );

    console.log(
      `Added job to refresh tokens for YouTube account ${accountId} with job ID ${job.id}`
    );
    return job.id;
  } catch (error) {
    console.error(
      `Failed to add YouTube token refresh job for account ${accountId}:`,
      error
    );
    throw error;
  }
}

// Process job to refresh all YouTube tokens
export async function processRefreshAllYoutubeTokensJob(jobData) {
  console.log("Processing job to refresh all YouTube tokens");

  try {
    await connectToDatabase();
    const SocialAccount = getSocialAccountModel();

    // Get all active YouTube accounts
    const accounts = await SocialAccount.find({
      platform: "ytshorts",
      status: { $ne: "disconnected" },
    });

    console.log(`Found ${accounts.length} YouTube accounts to refresh`);

    const results = {
      total: accounts.length,
      success: 0,
      failed: 0,
      accounts: [],
    };

    // Process each account
    for (const account of accounts) {
      try {
        console.log(`Refreshing tokens for YouTube account ${account._id}`);

        if (!account.refreshToken) {
          console.log(`Account ${account._id} has no refresh token, skipping`);
          results.accounts.push({
            accountId: account._id,
            name: account.name,
            success: false,
            error: "No refresh token available",
          });
          results.failed++;
          continue;
        }

        // Refresh tokens
        const refreshResult = await youtubeService.refreshTokens(account._id);

        if (refreshResult.success) {
          results.success++;
          results.accounts.push({
            accountId: account._id,
            name: account.name,
            success: true,
          });
        } else {
          results.failed++;
          results.accounts.push({
            accountId: account._id,
            name: account.name,
            success: false,
            error: refreshResult.message,
          });
        }
      } catch (error) {
        console.error(
          `Error refreshing tokens for YouTube account ${account._id}:`,
          error
        );
        results.failed++;
        results.accounts.push({
          accountId: account._id,
          name: account.name,
          success: false,
          error: error.message,
        });
      }
    }

    console.log(
      `Completed YouTube token refresh. Success: ${results.success}, Failed: ${results.failed}`
    );
    return results;
  } catch (error) {
    console.error("Error processing refresh all YouTube tokens job:", error);
    throw error;
  }
}

// Process job to refresh tokens for a specific YouTube account
export async function processRefreshYoutubeAccountTokensJob(jobData) {
  const { accountId } = jobData;

  if (!accountId) {
    throw new Error("Missing account ID for YouTube token refresh");
  }

  console.log(
    `Processing job to refresh tokens for YouTube account ${accountId}`
  );

  try {
    await connectToDatabase();
    const refreshResult = await youtubeService.refreshTokens(accountId);

    if (refreshResult.success) {
      console.log(
        `Successfully refreshed tokens for YouTube account ${accountId}`
      );
      return {
        accountId,
        success: true,
      };
    } else {
      console.error(
        `Failed to refresh tokens for YouTube account ${accountId}: ${refreshResult.message}`
      );
      return {
        accountId,
        success: false,
        error: refreshResult.message,
      };
    }
  } catch (error) {
    console.error(`Error processing YouTube account token refresh job:`, error);
    throw error;
  }
}

export default {
  initYoutubeTokenRefreshQueue,
  getYoutubeTokenRefreshQueue,
  scheduleRegularYoutubeTokenRefreshes,
  refreshAllYoutubeTokens,
  refreshYoutubeAccountTokens,
  processRefreshAllYoutubeTokensJob,
  processRefreshYoutubeAccountTokensJob,
};

// If this file is run directly as a script, initialize and run a test job
if (
  typeof process !== "undefined" &&
  process.argv[1] === fileURLToPath(import.meta.url)
) {
  console.log("YouTube token refresh queue script running in standalone mode");
  console.log("Initializing YouTube token refresh queue...");

  (async () => {
    try {
      // Initialize queue
      const queue = initYoutubeTokenRefreshQueue();

      // Schedule regular refreshes
      const jobId = await scheduleRegularYoutubeTokenRefreshes();
      console.log(
        `Scheduled regular YouTube token refreshes with job ID ${jobId}`
      );

      // Trigger an immediate refresh of all tokens
      const immediateJobId = await refreshAllYoutubeTokens();
      console.log(
        `Triggered immediate YouTube token refresh with job ID ${immediateJobId}`
      );

      console.log("YouTube token refresh operations completed successfully");
    } catch (error) {
      console.error(
        "Error in YouTube token refresh standalone operation:",
        error
      );
    }
  })();
}
