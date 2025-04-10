/**
 * Instagram API Service
 * Handles all Instagram-specific API operations
 */

import axios from "axios";

/**
 * Post content to Instagram
 *
 * @param {object} accountData - Instagram account data (token, user ID, etc.)
 * @param {object} postData - Content data (caption, media, etc.)
 * @returns {Promise<object>} - Result of the Instagram API call
 */
async function post(accountData, postData) {
  console.log("Instagram post service called", { accountData, postData });

  try {
    // Validate required fields for Instagram
    validateInstagramData(postData);

    // Determine what type of post this is (photo, carousel, video, etc.)
    const postType = determinePostType(postData.mediaFiles);

    // Get a fresh access token if needed
    const accessToken = await ensureFreshToken(accountData);

    // Create the post based on type
    let result;

    switch (postType) {
      case "photo":
        result = await createSinglePhotoPost(
          accessToken,
          accountData.userId,
          postData
        );
        break;
      case "carousel":
        result = await createCarouselPost(
          accessToken,
          accountData.userId,
          postData
        );
        break;
      case "video":
        result = await createVideoPost(
          accessToken,
          accountData.userId,
          postData
        );
        break;
      case "reels":
        result = await createReelsPost(
          accessToken,
          accountData.userId,
          postData
        );
        break;
      default:
        throw new Error(`Unsupported Instagram post type: ${postType}`);
    }

    return {
      postId: result.id,
      url: `https://www.instagram.com/p/${result.shortcode}/`,
      status: result.status,
    };
  } catch (error) {
    console.error("Error in Instagram post service:", error);
    throw error;
  }
}

/**
 * Determine the type of Instagram post based on media files
 *
 * @param {Array<object>} mediaFiles - The media files to post
 * @returns {string} - The type of post ('photo', 'carousel', 'video', 'reels')
 */
function determinePostType(mediaFiles) {
  if (!mediaFiles || mediaFiles.length === 0) {
    throw new Error("No media files provided for Instagram post");
  }

  // If there are multiple media files, it's a carousel
  if (mediaFiles.length > 1) {
    return "carousel";
  }

  // Check the type of the single media file
  const file = mediaFiles[0];

  if (file.type.startsWith("image/")) {
    return "photo";
  }

  if (file.type.startsWith("video/")) {
    // Determine if it's a regular video or a reel
    // This is a simplified logic - in reality, you might want to check additional properties
    // or allow the user to explicitly choose between video and reels
    return file.isReel ? "reels" : "video";
  }

  throw new Error(`Unsupported media type for Instagram: ${file.type}`);
}

/**
 * Validate the data required for Instagram posting
 *
 * @param {object} postData - The data to validate
 * @throws {Error} If required fields are missing
 */
function validateInstagramData(postData) {
  // Instagram requires at least one media file
  if (!postData.mediaFiles || postData.mediaFiles.length === 0) {
    throw new Error("Instagram posts require at least one media file");
  }

  // Instagram has a maximum of 10 files per carousel
  if (postData.mediaFiles.length > 10) {
    throw new Error(
      "Instagram carousel posts can have a maximum of 10 media files"
    );
  }

  // For each media file, check if it's a supported type
  for (const file of postData.mediaFiles) {
    if (
      !file.type ||
      !(file.type.startsWith("image/") || file.type.startsWith("video/"))
    ) {
      throw new Error(`Unsupported file type for Instagram: ${file.type}`);
    }
  }

  // Instagram caption length limit (2,200 characters)
  if (postData.textContent && postData.textContent.length > 2200) {
    throw new Error("Instagram captions cannot exceed 2,200 characters");
  }
}

/**
 * Ensure we have a fresh access token for the Instagram API
 *
 * @param {object} accountData - Account data with tokens
 * @returns {Promise<string>} - A valid access token
 */
async function ensureFreshToken(accountData) {
  if (!accountData.accessToken) {
    throw new Error("No access token available for this Instagram account");
  }

  // Check if token is expired and refresh if needed
  if (isTokenExpired(accountData)) {
    return await refreshInstagramToken(accountData);
  }

  return accountData.accessToken;
}

/**
 * Check if the access token is expired
 *
 * @param {object} accountData - Account data with token expiry
 * @returns {boolean} - True if token is expired
 */
function isTokenExpired(accountData) {
  if (!accountData.tokenExpiry) return true;

  // Add a buffer of 5 minutes
  const expiryTime =
    new Date(accountData.tokenExpiry).getTime() - 5 * 60 * 1000;
  return Date.now() > expiryTime;
}

/**
 * Refresh the Instagram access token
 *
 * @param {object} accountData - Account data with refresh token
 * @returns {Promise<string>} - New access token
 */
async function refreshInstagramToken(accountData) {
  // This would be an actual call to refresh the token
  // For now, this is a mock implementation
  console.log("Refreshing Instagram token for account:", accountData.id);

  // In a real implementation, you would:
  // 1. Call the Instagram/Facebook API to refresh the token
  // 2. Save the new tokens to your database
  // 3. Return the new access token

  return "mock-refreshed-token";
}

/**
 * Create a single photo post on Instagram
 */
async function createSinglePhotoPost(accessToken, userId, postData) {
  console.log("Creating single photo post on Instagram");

  // This would be an actual API call to the Instagram Graph API
  // This is a mock implementation for demonstration

  // Mock response for demonstration purposes
  return {
    id: "mock-instagram-post-id",
    shortcode: "ABC123xyz",
    status: "published",
  };
}

/**
 * Create a carousel post on Instagram
 */
async function createCarouselPost(accessToken, userId, postData) {
  console.log(
    "Creating carousel post on Instagram with",
    postData.mediaFiles.length,
    "items"
  );

  // Mock response for demonstration purposes
  return {
    id: "mock-instagram-carousel-id",
    shortcode: "DEF456uvw",
    status: "published",
  };
}

/**
 * Create a video post on Instagram
 */
async function createVideoPost(accessToken, userId, postData) {
  console.log("Creating video post on Instagram");

  // Mock response for demonstration purposes
  return {
    id: "mock-instagram-video-id",
    shortcode: "GHI789rst",
    status: "published",
  };
}

/**
 * Create a reels post on Instagram
 */
async function createReelsPost(accessToken, userId, postData) {
  console.log("Creating reels post on Instagram");

  // Mock response for demonstration purposes
  return {
    id: "mock-instagram-reels-id",
    shortcode: "JKL012opq",
    status: "published",
  };
}

// Additional Instagram-specific functions can be added here

const instagramService = {
  post,
  // Add other Instagram-specific methods as needed
};

export default instagramService;
