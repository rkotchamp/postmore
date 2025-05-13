/**
 * API Manager - Central service orchestrator for social media platforms
 * Handles routing to platform-specific services and standardizes responses
 */

// Import platform services
import blueSkyService from "./blueSkyService";

// Platform service registry
const platformServices = {
  // These are simulations except for bluesky which is a real implementation
  twitter: {
    post: async (account, data) => ({
      success: true,
      platformId: "twitter",
      postId: "sample-twitter-id",
      message: "Posted to Twitter (simulation)",
    }),
  },
  instagram: {
    post: async (account, data) => ({
      success: true,
      platformId: "instagram",
      postId: "sample-instagram-id",
      message: "Posted to Instagram (simulation)",
    }),
  },
  facebook: {
    post: async (account, data) => ({
      success: true,
      platformId: "facebook",
      postId: "sample-facebook-id",
      message: "Posted to Facebook (simulation)",
    }),
  },
  bluesky: blueSkyService,
};

/**
 * Post to a single platform
 *
 * @param {string} platform - Platform identifier
 * @param {Object} account - Account information
 * @param {Object} data - Post data
 * @returns {Promise<Object>} Result from the platform
 */
const postToPlatform = async (platform, account, data) => {
  try {
    // Get the platform service
    const service = platformServices[platform];

    if (!service) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Call the platform-specific post method with the original data structure
    // maintaining consistent property names
    const result = await service.post(account, data);

    return {
      success: true,
      platform,
      accountId: account.id,
      result,
    };
  } catch (error) {
    console.error(`Error posting to ${platform}:`, error);

    return {
      success: false,
      platform,
      accountId: account?.id,
      error: error.message || `Failed to post to ${platform}`,
    };
  }
};

/**
 * Post to multiple platforms
 *
 * @param {Array<Object>} targets - Array of {platform, account} objects
 * @param {Object} data - Post data
 * @returns {Promise<Array<Object>>} Results from all platforms
 */
const postToMultiplePlatforms = async (targets, data) => {
  // Post to each platform in parallel
  const results = await Promise.all(
    targets.map(({ platform, account }) =>
      postToPlatform(platform, account, data)
    )
  );

  return results;
};

/**
 * Schedule a post for later publication
 *
 * @param {string} platform - Platform identifier
 * @param {Object} account - Account information
 * @param {Object} data - Post data
 * @param {Date} scheduledTime - When to publish
 * @returns {Promise<Object>} Scheduling result
 */
const schedulePost = async (platform, account, data, scheduledTime) => {
  try {
    // Here you would integrate with a job queue like BullMQ
    // For this implementation, we'll simulate scheduling

    return {
      success: true,
      platform,
      accountId: account.id,
      scheduledTime,
      message: `Post scheduled for ${platform} at ${scheduledTime}`,
    };
  } catch (error) {
    console.error(`Error scheduling post for ${platform}:`, error);

    return {
      success: false,
      platform,
      accountId: account.id,
      error: error.message || `Failed to schedule post for ${platform}`,
    };
  }
};

/**
 * Get caption for a specific platform
 */
function getCaptionForPlatform(captions, platform, accountId) {
  if (!captions) return "";

  if (captions.mode === "single") {
    return captions.single || "";
  }

  // Return account-specific caption or fall back to default
  return captions.multipleCaptions?.[accountId] || captions.single || "";
}

// Export the API Manager functions
export const apiManager = {
  postToPlatform,
  postToMultiplePlatforms,
  schedulePost,
};
