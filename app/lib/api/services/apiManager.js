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
    // Add detailed logging for debugging
    console.log(`ApiManager: Posting to platform: ${platform}`);
    console.log(
      `ApiManager: Account data:`,
      JSON.stringify(
        {
          ...account,
          // Redact sensitive data
          accessToken: account.accessToken ? "[REDACTED]" : undefined,
          refreshToken: account.refreshToken ? "[REDACTED]" : undefined,
          appPassword: account.appPassword ? "[REDACTED]" : undefined,
        },
        null,
        2
      )
    );

    // Map the incoming data
    const mappedData = { ...data };

    // Process media if present
    if (
      mappedData.media &&
      Array.isArray(mappedData.media) &&
      mappedData.media.length > 0
    ) {
      // Transform media array to have the expected structure
      console.log(
        `ApiManager: Original media count: ${mappedData.media.length}`
      );

      mappedData.media = mappedData.media
        .map((item) => {
          try {
            // If this is a client-side structure with file and fileInfo
            if (item.fileInfo) {
              console.log(
                `ApiManager: Converting client media format to service format for ${item.fileInfo.name}`
              );

              if (!item.url) {
                console.warn(
                  `ApiManager: Media item missing URL: ${item.fileInfo.name}`
                );
                return null;
              }

              return {
                url: item.url,
                type: item.fileInfo.type || item.type || "unknown/unknown",
                size: item.fileInfo.size || 0,
                originalName: item.fileInfo.name,
                altText: item.altText || "",
              };
            }

            // Already in the right format but check for URL
            if (!item.url) {
              console.warn(
                `ApiManager: Media item missing URL: ${
                  item.originalName || item.name || "unknown"
                }`
              );
              return null;
            }

            return item;
          } catch (mediaError) {
            console.error(
              `ApiManager: Error processing media item:`,
              mediaError
            );
            return null;
          }
        })
        .filter((item) => item !== null); // Filter out items without URLs as they can't be processed

      console.log(
        `ApiManager: Processed ${mappedData.media.length} valid media items`
      );

      // If we've lost all media items but this is a media post, return an error
      if (mappedData.media.length === 0 && mappedData.contentType === "media") {
        throw new Error(
          "No valid media items found for media post. Ensure all files are uploaded properly with URLs."
        );
      }
    }

    console.log(
      `ApiManager: Post data after mapping:`,
      JSON.stringify(
        {
          contentType: mappedData.contentType,
          mediaCount: mappedData.media?.length || 0,
          hasText: !!mappedData.text,
          captionMode: mappedData.captions?.mode,
        },
        null,
        2
      )
    );

    // Get the platform service
    const service = platformServices[platform];

    if (!service) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Map account data for specific platforms
    let mappedAccount = { ...account };

    // If it's Bluesky, ensure the account data has the expected structure
    if (platform === "bluesky") {
      console.log("ApiManager: Mapping account data for Bluesky");
      mappedAccount = {
        id: account.id,
        platformUsername: account.email || account.name, // Using email field which contains username.bsky.social
        platformAccountId: account.platformId, // DID from database
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        // Add any other fields needed by the Bluesky service
      };

      // Validate Bluesky-specific account data
      if (!mappedAccount.platformUsername) {
        throw new Error(
          "Missing platformUsername (handle) for Bluesky account"
        );
      }

      if (!mappedAccount.platformAccountId) {
        throw new Error("Missing platformAccountId (DID) for Bluesky account");
      }

      if (!mappedAccount.accessToken) {
        throw new Error("Missing accessToken for Bluesky account");
      }

      console.log(
        "ApiManager: Mapped Bluesky account:",
        JSON.stringify(
          {
            ...mappedAccount,
            platformUsername: mappedAccount.platformUsername,
            platformAccountId: mappedAccount.platformAccountId,
            accessToken: "[REDACTED]",
            refreshToken: "[REDACTED]",
          },
          null,
          2
        )
      );
    }

    // Call the platform-specific post method with the mapped account data
    console.log(`ApiManager: Calling ${platform} service post method`);
    const result = await service.post(mappedAccount, mappedData);
    console.log(
      `ApiManager: ${platform} post result:`,
      JSON.stringify(result, null, 2)
    );

    return {
      success: true,
      platform,
      accountId: account.id,
      result,
    };
  } catch (error) {
    console.error(`ApiManager: Error posting to ${platform}:`, error);

    // Provide more detailed error info for debugging
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    };

    console.error(
      `ApiManager: Detailed error for ${platform}:`,
      JSON.stringify(errorInfo, null, 2)
    );

    return {
      success: false,
      platform,
      accountId: account?.id,
      error: error.message || `Failed to post to ${platform}`,
      errorDetails: errorInfo,
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
