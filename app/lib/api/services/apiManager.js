/**
 * API Manager - Central service orchestrator for social media platforms
 * Handles routing to platform-specific services and standardizes responses
 */

// Import platform services
import blueSkyService from "./BlueSky/blueSkyService";
import youtubeService from "./youtube/youtubeService";
import tiktokService from "./tiktok/tiktokService";
import linkedinService from "./linkedinService";
import instagramService from "./instagramService";
import { addPostToQueue } from "@/app/lib/queues/postQueue";

// Platform service registry
const platformServices = {
  // These are simulations except for integrated services
  twitter: {
    post: async (account, data) => ({
      success: true,
      platformId: "twitter",
      postId: "sample-twitter-id",
      message: "Posted to Twitter (simulation)",
    }),
  },
  instagram: instagramService, // Real Instagram service via Facebook Graph API
  facebook: {
    post: async (account, data) => ({
      success: true,
      platformId: "facebook",
      postId: "sample-facebook-id",
      message: "Posted to Facebook (simulation)",
    }),
  },
  bluesky: blueSkyService,
  ytShorts: youtubeService, // YouTube Shorts service
  tiktok: tiktokService, // TikTok service
  linkedin: linkedinService, // LinkedIn service
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
  console.log(`🔍 APIMANAGER: Starting ${platform} post`);
  console.log(`🔍 APIMANAGER: Account for ${platform}:`, JSON.stringify(account, null, 2));
  console.log(`🔍 APIMANAGER: Data for ${platform}:`, JSON.stringify(data, null, 2));
  
  try {
    // Map the incoming data
    const mappedData = { ...data };

    // Add platform-specific flags to inform services about the platform context
    mappedData.platformContext = {
      platform,
      requiresDirectMediaUpload: platform === "bluesky", // Flag for platforms requiring direct file uploads
    };

    // Process media if present
    if (
      mappedData.media &&
      Array.isArray(mappedData.media) &&
      mappedData.media.length > 0
    ) {
      // Transform media array to have the expected structure

      mappedData.media = mappedData.media
        .map((item) => {
          try {
            // If this is a client-side structure with file and fileInfo
            if (item.fileInfo) {
              // For platforms that require direct file uploads (like BlueSky),
              // we can skip the URL validation if we have a file object
              const hasBlueSkyVideo =
                platform === "bluesky" &&
                (item.isDirectUploadVideo ||
                  (item.fileInfo.type &&
                    item.fileInfo.type.startsWith("video/")));

              // BlueSky videos can be uploaded directly with the file object
              // For non-BlueSky platforms or non-videos, we need a URL
              if (!item.url && !hasBlueSkyVideo) {
                console.warn(
                  `ApiManager: Media item missing URL and not a direct upload: ${item.fileInfo.name}`
                );
                return null;
              }

              return {
                url: item.url || null, // URL may be null for direct uploads
                type: item.fileInfo.type || item.type || "unknown/unknown",
                size: item.fileInfo.size || 0,
                originalName: item.fileInfo.name,
                altText: item.altText || "",
                // Pass through the file object for platforms that need direct file access (like BlueSky videos)
                file: item.fileObject || item.file || null,
                isDirectUploadVideo: !!item.isDirectUploadVideo,
                id: item.id,
              };
            }

            // Already in the right format but check for URL
            // For BlueSky videos, we can still proceed without URL if we have a file
            const isDirectBlueSkyVideo =
              platform === "bluesky" &&
              (item.isDirectUploadVideo ||
                (item.type && item.type.startsWith("video/")) ||
                (item.file &&
                  item.file.type &&
                  item.file.type.startsWith("video/")));

            if (!item.url && !isDirectBlueSkyVideo) {
              console.warn(
                `ApiManager: Media item missing URL and not a direct upload: ${
                  item.originalName || item.name || "unknown"
                }`
              );
              // For validation in database schema, URL is required except for direct uploads
              return null;
            }

            // Create a complete media item with both URL (for database) and file (for direct uploads)
            // This ensures we meet database requirements while supporting direct uploads
            return {
              ...item,
              url: item.url, // URL for database validation (may be null for direct uploads)
              type:
                item.type ||
                (item.file && item.file.type) ||
                "application/octet-stream", // Ensure type exists for validation
              file: item.fileObject || item.file || null, // File object for direct upload platforms
              originalName: item.originalName || item.file?.name || "unknown", // Ensure we have a name
              isDirectUploadVideo:
                !!item.isDirectUploadVideo ||
                (platform === "bluesky" &&
                  ((item.type && item.type.startsWith("video/")) ||
                    (item.file &&
                      item.file.type &&
                      item.file.type.startsWith("video/")))),
              id: item.id,
            };
          } catch (mediaError) {
            console.error(
              `ApiManager: Error processing media item:`,
              mediaError
            );
            return null;
          }
        })
        .filter((item) => item !== null); // Filter out items without URLs or direct uploads

      // If we've lost all media items but this is a media post, return an error
      if (mappedData.media.length === 0 && mappedData.contentType === "media") {
        throw new Error(
          "No valid media items found for media post. Ensure all files are uploaded properly with URLs or available for direct upload."
        );
      }
    }

    // Get the platform service
    const service = platformServices[platform];

    if (!service) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Map account data for specific platforms
    let mappedAccount = { ...account };

    // If it's Bluesky, ensure the account data has the expected structure
    if (platform === "bluesky") {
      mappedAccount = {
        id: account.id,
        platformUsername: account.email || account.name, // Using email field which contains username.bsky.social
        platformAccountId:
          account.platformAccountId ||
          account.originalData?.platformAccountId ||
          account.platformId, // DID from database
        accessToken: account.accessToken || account.originalData?.accessToken,
        refreshToken:
          account.refreshToken || account.originalData?.refreshToken,
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
    }

    // If it's Instagram, ensure the account data has the expected structure
    if (platform === "instagram") {
      mappedAccount = extractAccountData(account);

      // Validate Instagram-specific account data
      if (!mappedAccount.accessToken) {
        throw new Error("Missing accessToken for Instagram account");
      }

      if (!mappedAccount.platformAccountId) {
        throw new Error("Missing platformAccountId (Instagram Business Account ID) for Instagram account");
      }

      // Transform media array to mediaFiles for Instagram service
      if (mappedData.media && Array.isArray(mappedData.media)) {
        mappedData.mediaFiles = mappedData.media;
        // Keep media for backwards compatibility but Instagram service uses mediaFiles
      }

      // Transform captions for Instagram
      if (mappedData.captions) {
        const caption = getCaptionForPlatform(
          mappedData.captions,
          platform,
          account.id
        );
        mappedData.textContent = caption;
      }
    }

    // If it's TikTok, ensure the account data has the expected structure
    if (platform === "tiktok") {
      mappedAccount = extractAccountData(account);

      // Validate TikTok-specific account data
      if (!mappedAccount.accessToken) {
        throw new Error("Missing accessToken for TikTok account");
      }

      // Transform media array to mediaFiles for TikTok service
      if (mappedData.media && Array.isArray(mappedData.media)) {
        mappedData.mediaFiles = mappedData.media;
        // Keep media for backwards compatibility but TikTok service uses mediaFiles
      }

      // Transform captions for TikTok
      if (mappedData.captions) {
        const caption = getCaptionForPlatform(
          mappedData.captions,
          platform,
          account.id
        );
        mappedData.textContent = caption;
      }
    }

    // If it's LinkedIn, ensure the account data has the expected structure
    if (platform === "linkedin") {
      mappedAccount = {
        id: account.id,
        platformAccountId: account.platformAccountId || account.originalData?.platformAccountId || account.platformId,
        accessToken: account.accessToken || account.originalData?.accessToken,
        refreshToken: account.refreshToken || account.originalData?.refreshToken,
        tokenExpiresAt: account.tokenExpiresAt || account.originalData?.tokenExpiresAt,
        // Add any other fields needed by the LinkedIn service
      };

      // Validate LinkedIn-specific account data
      if (!mappedAccount.accessToken) {
        throw new Error("Missing accessToken for LinkedIn account");
      }

      if (!mappedAccount.platformAccountId) {
        throw new Error("Missing platformAccountId for LinkedIn account");
      }

      // Transform media array to mediaFiles for LinkedIn service
      if (mappedData.media && Array.isArray(mappedData.media)) {
        mappedData.mediaFiles = mappedData.media;
        // Keep media for backwards compatibility but LinkedIn service uses mediaFiles
      }

      // Transform captions for LinkedIn
      if (mappedData.captions) {
        const caption = getCaptionForPlatform(
          mappedData.captions,
          platform,
          account.id
        );
        mappedData.textContent = caption;
      }
    }

    // If it's YouTube, ensure the account data has the expected structure
    if (platform === "ytShorts") {
      mappedAccount = {
        id: account.id,
        platformAccountId: account.platformAccountId || account.originalData?.platformAccountId || account.platformId,
        accessToken: account.accessToken || account.originalData?.accessToken,
        refreshToken: account.refreshToken || account.originalData?.refreshToken,
        tokenExpiresAt: account.tokenExpiresAt || account.originalData?.tokenExpiresAt,
        channelId: account.channelId || account.originalData?.channelId,
        // Add any other fields needed by the YouTube service
      };

      // Validate YouTube-specific account data
      if (!mappedAccount.accessToken) {
        throw new Error("Missing accessToken for YouTube account");
      }

      if (!mappedAccount.refreshToken) {
        throw new Error("Missing refreshToken for YouTube account");
      }

      // Transform media array for YouTube service
      if (mappedData.media && Array.isArray(mappedData.media)) {
        // YouTube expects the media in the same format
        mappedData.media = mappedData.media;
      }

      // Transform captions for YouTube
      if (mappedData.captions) {
        const caption = getCaptionForPlatform(
          mappedData.captions,
          platform,
          account.id
        );
        mappedData.text = caption;
      }
    }

    // Call the platform-specific post method with the mapped account data
    console.log(`🔍 APIMANAGER: Calling ${platform} service with:`);
    console.log(`🔍 APIMANAGER: mappedAccount:`, JSON.stringify(mappedAccount, null, 2));
    console.log(`🔍 APIMANAGER: mappedData:`, JSON.stringify(mappedData, null, 2));

    const result = await service.post(mappedAccount, mappedData);
    
    console.log(`🔍 APIMANAGER: ${platform} service result:`, JSON.stringify(result, null, 2));

    // If platform is YouTube and we're using native scheduling, handle it properly
    if (
      platform === "ytShorts" &&
      result.isScheduled &&
      result.nativeScheduling
    ) {
      // For YouTube with native scheduling, add specific YouTube data to the result
      const youtubeData = {
        videoId: result.videoId,
        status: result.status || "scheduled",
        publishAt: result.scheduledTime,
        privacyStatus: "private", // Will be published by YouTube at scheduled time
      };

      return {
        success: true,
        postId: result.videoId,
        url: result.url,
        nativeScheduling: true,
        scheduledTime: result.scheduledTime,
        youtubeData, // Add platform-specific data
      };
    }

    // If platform is Instagram, handle the result properly
    if (platform === "instagram" && result.postId) {
      // For Instagram, add specific Instagram data to the result
      const instagramData = {
        mediaId: result.postId,
        status: result.status || "published",
        permalinkUrl: result.url,
      };

      return {
        success: true,
        postId: result.postId,
        url: result.url,
        instagramData, // Add platform-specific data
      };
    }

    // If platform is TikTok and we have a successful result, handle it properly
    if (platform === "tiktok" && result.success) {
      // For TikTok, add specific TikTok data to the result
      const tiktokData = {
        publishId: result.postId,
        status: result.status || "published",
        shareUrl: result.url,
        mediaType: result.mediaType,
        privacyLevel: result.privacyLevel,
      };

      return {
        success: true,
        postId: result.postId,
        url: result.url,
        tiktokData, // Add platform-specific data
      };
    }

    // If platform is LinkedIn and we have a successful result, handle it properly
    if (platform === "linkedin" && result.postId) {
      // For LinkedIn, add specific LinkedIn data to the result
      const linkedinData = {
        shareId: result.postId,
        status: result.status || "published",
        permalink: result.url,
      };

      return {
        success: true,
        postId: result.postId,
        url: result.url,
        linkedinData, // Add platform-specific data
      };
    }

    return {
      success: true,
      platform,
      accountId: account.id,
      result,
    };
  } catch (error) {
    console.error(
      `ApiManager: Error in postToPlatform for ${platform}:`,
      error
    );
    console.error(
      `ApiManager: Error name: ${error.name}, Message: ${error.message}, Stack: ${error.stack}`
    );

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
    // For YouTube, we can use the platform's native scheduling
    if (platform === "ytShorts") {
      try {
        console.log(
          `Using YouTube native scheduling for post at ${scheduledTime}`
        );

        // Add scheduledTime to the data object for the YouTube service
        const youtubeData = {
          ...data,
          scheduledTime: scheduledTime,
        };

        // Call the YouTube service directly with scheduled time
        const result = await platformServices.ytShorts.post(
          account,
          youtubeData
        );

        return {
          success: true,
          platform,
          accountId: account.id,
          scheduledTime: scheduledTime,
          result,
          message: `Post scheduled for ${platform} using YouTube's native scheduling for ${scheduledTime}`,
          nativeScheduling: true,
        };
      } catch (youtubeError) {
        console.error(`Error using YouTube native scheduling:`, youtubeError);
        throw new Error(`YouTube scheduling failed: ${youtubeError.message}`);
      }
    }

    // For other platforms, use our queue system
    // Construct the postData object expected by addPostToQueue
    // Assuming 'data' contains userId, content (which includes text, media, captions)
    // and 'account' is the full account object.
    // The 'data' object in schedulePost comes from 'schedulePostData' in submit/route.js
    // which is: { postId, contentType, text, media, captions }
    // We need userId from the session, which isn't directly available here.
    // Let's assume for now 'data' can also include 'userId'.
    // If not, we'll need to adjust how userId is passed down.

    // The addPostToQueue function expects:
    // postData: { userId, account (full object), content (object with text, media, etc.) }
    // scheduledAt: Date object

    // 'data' currently contains: { postId, contentType, text, media, captions }
    // 'account' is the account object for the specific platform.

    // We need to ensure userId is part of the 'data' payload or passed separately.
    // For now, let's assume 'data.userId' exists or can be added.
    // If 'data.userId' is not available, this will need adjustment.
    // The 'postData' in 'submit/route.js' has 'userId: session.user.id'
    // but 'schedulePostData' in 'submit/route.js' does NOT pass userId.
    // We need to ensure userId is passed to schedulePost.

    // For now, let's construct what we can and address userId if it's an issue.
    const postDataForQueue = {
      // userId: data.userId, // This needs to be ensured
      account: account, // The full account object
      content: {
        // Reconstruct content object
        contentType: data.contentType,
        text: data.text,
        media: data.media,
        captions: data.captions,
        postId: data.postId, // Keep postId for reference in the worker
      },
      platform: platform, // Add platform here for clarity in the queue job data
    };

    // The original addPostToQueue in postQueue.js takes jobData as:
    // { userId, platform, accountData, content, createdAt }
    // Let's adjust the data sent to `addPostToQueue` to match its internal expectations.
    // The `accountData` in `postQueue.js` is `postData.account`.
    // The `content` in `postQueue.js` is `postData.content`.

    const jobPayload = {
      // userId: data.userId, // Needs to be passed into 'data' for schedulePost
      account: account, // This is the account object
      content: {
        contentType: data.contentType,
        text: data.text,
        media: data.media,
        captions: data.captions,
        postId: data.postId, // Reference to the saved post
      },
      // platform is not explicitly in the original postData structure for addPostToQueue
      // but it's useful. The original addPostToQueue extracts it from postData.account.platform
    };

    // Ensure userId is present in the 'data' object passed to schedulePost.
    // This should be done in app/api/posts/submit/route.js when calling apiManager.schedulePost.
    // For now, we proceed assuming 'data.userId' will be made available.
    if (!data.userId) {
      console.error(
        "ApiManager.schedulePost: Missing userId in data. Cannot add to queue."
      );
      throw new Error(
        "Missing userId for scheduled post. Please ensure it's included in the data payload."
      );
    }

    const jobDataForQueue = {
      userId: data.userId,
      account: account, // Passed as 'accountData' in addPostToQueue
      content: {
        contentType: data.contentType,
        text: data.text,
        media: data.media,
        captions: data.captions,
        postId: data.postId,
      },
      // 'platform' will be derived from 'account.platform' inside addPostToQueue
    };

    const jobId = await addPostToQueue(jobDataForQueue, scheduledTime);

    return {
      success: true,
      platform,
      accountId: account.id,
      scheduledTime,
      jobId, // Return the BullMQ job ID
      message: `Post scheduled for ${platform} at ${scheduledTime} with Job ID: ${jobId}`,
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
 * Extract account data from different formats
 */
function extractAccountData(account) {
  if (account.originalData) {
    return {
      ...account.originalData,
      id: account.id,
      platformId: account.platformId || account.originalData.platformAccountId,
    };
  }
  return account;
}

/**
 * Get caption for a specific platform
 */
function getCaptionForPlatform(captions, platform, accountId) {
  if (!captions) return "";

  if (captions.mode === "single") {
    return captions.single || "";
  }

  // Return account-specific caption or fall back to default
  return captions.multiple?.[accountId] || captions.single || "";
}

// Export the API Manager functions
export const apiManager = {
  postToPlatform,
  postToMultiplePlatforms,
  schedulePost,
};
