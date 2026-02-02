/**
 * TikTok API Service
 * Handles all TikTok-specific API operations
 */

import axios from "axios";

// TikTok API endpoints
const TIKTOK_API_BASE_URL = "https://open.tiktokapis.com/v2";
const TIKTOK_OAUTH_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_REFRESH_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

// TikTok App credentials from .env
const TIKTOK_CLIENT_ID = process.env.TIKTOK_CLIENT_ID;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI;

// Validate critical configuration
if (!TIKTOK_CLIENT_ID || !TIKTOK_CLIENT_SECRET || !TIKTOK_REDIRECT_URI) {
  console.error(
    "Missing required TikTok configuration in environment variables"
  );
}

/**
 * Get creator info to check posting eligibility and limits
 * In sandbox mode, returns mock data since the endpoint is not available
 *
 * @param {string} accessToken - Valid TikTok access token
 * @returns {Promise<object>} - Creator info from TikTok API or mock data
 */
async function getCreatorInfo(accessToken) {
  console.log("========== TikTok getCreatorInfo Started ==========");

  // Check if we're in sandbox mode
  const isSandbox =
    process.env.TIKTOK_SANDBOX_MODE === "true" ||
    process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID?.includes("sbawl");

  if (isSandbox) {
    console.log("Running in TikTok sandbox mode - returning mock creator info");

    // Return mock data for sandbox testing
    const mockCreatorInfo = {
      nickname: "TikTok Sandbox User",
      avatar_url:
        "https://p16-sign.tiktokcdn-us.com/tos-useast5-avt-0068-tx/default_avatar.webp",
      display_name: "sandbox_user",
      bio_description: "This is a sandbox test account",
      follower_count: 100,
      following_count: 50,
      likes_count: 1000,
      video_count: 25,
      can_post: true, // Allow posting in sandbox
      max_video_post_duration_sec: 180, // 3 minutes max
      privacy_level_options: [
        "PUBLIC_TO_EVERYONE",
        "SELF_ONLY",
        "MUTUAL_FOLLOW_FRIENDS",
      ],
    };

    console.log("Returning mock creator info for sandbox mode");
    console.log(
      "========== TikTok getCreatorInfo Completed (Sandbox) =========="
    );
    return mockCreatorInfo;
  }

  try {
    console.log(
      "Fetching creator info from TikTok API endpoint:",
      `${TIKTOK_API_BASE_URL}/post/publish/creator/info/`
    );
    console.log(
      "Making request with access token:",
      accessToken ? `${accessToken.substring(0, 10)}...` : undefined
    );

    const response = await axios.get(
      `${TIKTOK_API_BASE_URL}/post/publish/creator/info/`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log("TikTok creator info API response status:", response.status);
    console.log("TikTok creator info API response headers:", response.headers);
    console.log(
      "TikTok creator info API response data:",
      JSON.stringify(response.data, null, 2)
    );

    if (!response.data || !response.data.data) {
      console.error("Invalid creator info response:", response.data);
      throw new Error("Invalid response format from TikTok API");
    }

    console.log(
      "========== TikTok getCreatorInfo Completed Successfully =========="
    );
    return response.data.data;
  } catch (error) {
    console.error("========== TikTok getCreatorInfo Failed ==========");
    console.error(
      "Error fetching creator info:",
      error.response?.data || error.message
    );
    console.error("Error details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data,
    });
    throw new Error(
      `Failed to fetch creator info: ${
        error.response?.data?.error?.message || error.message
      }`
    );
  }
}

/**
 * Post content to TikTok
 *
 * @param {object} accountData - TikTok account data (token, refresh token, user info, etc.)
 * @param {object} postData - Content data (caption, media, etc.) from API Manager
 * @returns {Promise<object>} - Result of the TikTok API call
 */
async function post(accountData, postData) {
  console.log("TikTok post service called", {
    accountData: { ...accountData, accessToken: "***REDACTED***" },
    postData: {
      contentType: postData.contentType,
      text: postData.text,
      mediaCount: postData.media?.length || 0,
    },
  });

  try {
    // Map API Manager data format to TikTok service format
    const mappedPostData = {
      textContent: postData.text || "",
      mediaFiles: (postData.media || []).map((item) => ({
        url: item.url,
        type: item.type,
        size: item.size || 0,
        duration: item.duration,
        originalName: item.originalName || item.name || "media_file",
      })),
      title: postData.text ? postData.text.substring(0, 100) : "TikTok Post",
      // Add default TikTok settings
      privacyLevel: "SELF_ONLY", // Default to private for testing
      disableComment: false,
      disableDuet: false,
      disableStitch: false,
    };

    // Determine media type
    mappedPostData.mediaType = determineMediaType(mappedPostData.mediaFiles);

    // Validate required fields for TikTok
    validateTikTokData(mappedPostData);

    // Check if we're in sandbox mode
    const isSandbox =
      process.env.TIKTOK_SANDBOX_MODE === "true" ||
      process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID?.includes("sbawl") ||
      process.env.NODE_ENV === "development";

    if (isSandbox) {
      console.log("🧪 TikTok SANDBOX MODE: Making real API calls");
      console.log("📋 Note: Posts will be restricted to SELF_ONLY (private) viewing");
      console.log("⚠️  Account must be set to private in TikTok app");
      
      // Force privacy to SELF_ONLY for sandbox (required for unaudited apps)
      mappedPostData.privacyLevel = "SELF_ONLY";
      
      console.log("🔒 Privacy level forced to SELF_ONLY for sandbox compliance");
    }

    // Continue with real TikTok API for production...

    // 1. Get a fresh access token if needed
    const accessToken = await ensureFreshToken(accountData);

    // 2. Get creator info to check if posting is allowed and verify limits
    const creatorInfo = await getCreatorInfo(accessToken);

    // Check if the creator can post
    if (!creatorInfo.can_post) {
      throw new Error(
        "This TikTok account cannot post at this moment. Please try again later."
      );
    }

    // Check video duration against creator's max allowed duration if it's a video
    const isVideo = mappedPostData.mediaType === "VIDEO";

    if (
      isVideo &&
      mappedPostData.mediaFiles[0]?.duration >
        creatorInfo.max_video_post_duration_sec
    ) {
      throw new Error(
        `Video exceeds maximum allowed duration of ${creatorInfo.max_video_post_duration_sec} seconds`
      );
    }

    // 4. Initialize and publish content
    const postResult = await initializeAndPublishContent(
      accessToken,
      mappedPostData,
      mappedPostData.mediaType,
      creatorInfo
    );

    return {
      success: true,
      postId: postResult.publish_id,
      status: postResult.publish_status || "published",
      url: postResult.share_url || null,
      mediaType: mappedPostData.mediaType,
      privacyLevel: mappedPostData.privacyLevel,
    };
  } catch (error) {
    console.error("Error in TikTok post service:", error);
    return {
      success: false,
      error: error.message,
      platform: "tiktok",
    };
  }
}

/**
 * Determine the media type based on files
 *
 * @param {Array<object>} mediaFiles - The media files to post
 * @returns {string} - 'VIDEO' or 'PHOTO'
 */
function determineMediaType(mediaFiles) {
  if (!mediaFiles || mediaFiles.length === 0) {
    throw new Error("No media files provided");
  }

  const firstFile = mediaFiles[0];

  if (firstFile.type && firstFile.type.startsWith("video/")) {
    return "VIDEO";
  } else if (firstFile.type && firstFile.type.startsWith("image/")) {
    return "PHOTO";
  } else {
    throw new Error(`Unsupported media type: ${firstFile.type}`);
  }
}

/**
 * Initialize and publish content to TikTok
 *
 * @param {string} accessToken - Valid access token
 * @param {object} postData - Content data
 * @param {string} mediaType - 'VIDEO' or 'PHOTO'
 * @param {object} creatorInfo - Creator info from TikTok API
 * @returns {Promise<object>} - Result from TikTok API
 */
async function initializeAndPublishContent(
  accessToken,
  postData,
  mediaType,
  creatorInfo
) {
  // Prepare the payload based on the requirements from TikTok API
  const payload = {
    post_info: {
      title: postData.title || "",
      description: postData.textContent || "",
      privacy_level:
        postData.privacyLevel || creatorInfo.privacy_level_options[0], // Default to first available option
      disable_comment: postData.disableComment || false,
      disable_duet: postData.disableDuet || false,
      disable_stitch: postData.disableStitch || false,
      auto_add_music: true,
    },
    source_info: {
      source: "PULL_FROM_URL",
    },
    post_mode: "DIRECT_POST", // Using direct post mode
    media_type: mediaType,
  };

  // Add media-specific properties
  if (mediaType === "PHOTO") {
    payload.source_info.photo_cover_index = 0;
    payload.source_info.photo_images = postData.mediaFiles.map(
      (file) => file.url
    );
  } else {
    // For VIDEO
    payload.source_info.video_url = postData.mediaFiles[0].url;
  }

  // Add commercial content disclosure if specified
  if (postData.isCommercialContent) {
    payload.post_info.brand_organic = postData.isBrandOrganic || false;
    payload.post_info.brand_content = postData.isBrandedContent || false;
  }

  console.log("Initializing TikTok content post", payload);

  try {
    // Call the TikTok API to initialize content posting
    const response = await axios.post(
      `${TIKTOK_API_BASE_URL}/post/publish/content/init/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const initResult = response.data.data;
    const publishId = initResult.publish_id;

    console.log("TikTok content initialized successfully", { publishId });

    // For direct post mode, we need to check the status using the status API
    return await checkPublishStatus(accessToken, publishId);
  } catch (error) {
    console.error(
      "Error initializing TikTok content:",
      error.response?.data || error.message
    );
    throw new Error(
      `Failed to post to TikTok: ${
        error.response?.data?.error?.message || error.message
      }`
    );
  }
}

/**
 * Check the status of a published post
 *
 * @param {string} accessToken - Valid access token
 * @param {string} publishId - The publish ID from initialization
 * @returns {Promise<object>} - Status information
 */
async function checkPublishStatus(accessToken, publishId) {
  try {
    const response = await axios.post(
      `${TIKTOK_API_BASE_URL}/post/publish/status/query/`,
      { publish_id: publishId },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.data;
  } catch (error) {
    console.error(
      "Error checking publish status:",
      error.response?.data || error.message
    );
    throw new Error(
      `Failed to check publish status: ${
        error.response?.data?.error?.message || error.message
      }`
    );
  }
}

/**
 * Validate the data required for TikTok posting
 *
 * @param {object} postData - The data to validate
 * @throws {Error} If required fields are missing
 */
function validateTikTokData(postData) {
  // TikTok requires at least one media file
  if (!postData.mediaFiles || postData.mediaFiles.length === 0) {
    throw new Error(
      "TikTok posts require at least one media file (video or photo)"
    );
  }

  // For videos
  if (
    postData.mediaType === "VIDEO" ||
    (postData.mediaFiles[0].type &&
      postData.mediaFiles[0].type.startsWith("video/"))
  ) {
    const videoFile = postData.mediaFiles[0];

    // Check if the file has a URL
    if (!videoFile.url) {
      throw new Error("Video URL is required for TikTok posting");
    }

    // Check if the video meets TikTok's requirements (this is a simplified check)
    // TikTok has specific requirements for video length, size, aspect ratio, etc.
    if (videoFile.size > 287108864) {
      // 287MB max size for TikTok
      throw new Error("Video file is too large for TikTok (max 287MB)");
    }
  }
  // For photos
  else if (
    postData.mediaType === "PHOTO" ||
    (postData.mediaFiles[0].type &&
      postData.mediaFiles[0].type.startsWith("image/"))
  ) {
    // Check if all photos have URLs
    const missingUrls = postData.mediaFiles.some((file) => !file.url);
    if (missingUrls) {
      throw new Error("All photo URLs are required for TikTok posting");
    }

    // TikTok has a maximum of 35 images for photo mode posts
    if (postData.mediaFiles.length > 35) {
      throw new Error(
        "TikTok photo mode posts can have a maximum of 35 images"
      );
    }
  } else {
    throw new Error("Unsupported media type for TikTok");
  }

  // If commercial content is selected, at least one option must be chosen
  if (
    postData.isCommercialContent &&
    !postData.isBrandOrganic &&
    !postData.isBrandedContent
  ) {
    throw new Error(
      "When disclosing commercial content, you must select at least one option (Your Brand or Branded Content)"
    );
  }
}

/**
 * Ensure we have a fresh access token for the TikTok API
 *
 * @param {object} accountData - Account data with tokens
 * @returns {Promise<string>} - A valid access token
 */
async function ensureFreshToken(accountData) {
  if (!accountData.accessToken) {
    throw new Error("No access token available for this TikTok account");
  }

  // Check if token is expired and refresh if needed
  if (isTokenExpired(accountData)) {
    return await refreshTikTokToken(accountData);
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
 * Refresh the TikTok access token
 *
 * @param {object} accountData - Account data with refresh token
 * @returns {Promise<string>} - New access token
 */
async function refreshTikTokToken(accountData) {
  console.log("Refreshing TikTok token for account:", accountData.id);

  if (!accountData.refreshToken) {
    throw new Error("No refresh token available for this TikTok account");
  }

  try {
    // Create FormData-like object with URLSearchParams
    const formData = new URLSearchParams();
    formData.append("client_key", TIKTOK_CLIENT_ID);
    formData.append("client_secret", TIKTOK_CLIENT_SECRET);
    formData.append("grant_type", "refresh_token");
    formData.append("refresh_token", accountData.refreshToken);

    console.log("Refresh token request formatted as form data");

    const response = await axios.post(TIKTOK_REFRESH_TOKEN_URL, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const data = response.data.data;

    // This would typically update the database with new tokens
    console.log("TikTok token refreshed successfully");

    return data.access_token;
  } catch (error) {
    console.error(
      "Error refreshing TikTok token:",
      error.response?.data || error.message
    );
    throw new Error("Failed to refresh TikTok token");
  }
}

/**
 * Get access token from authorization code
 *
 * @param {string} code - Authorization code from OAuth flow
 * @returns {Promise<object>} - Token response
 */
async function getAccessToken(code) {
  console.log("========== TikTok getAccessToken Started ==========");
  try {
    console.log(
      "Getting access token with code:",
      code ? `${code.substring(0, 10)}...` : undefined
    );
    console.log("Using TikTok OAuth URL:", TIKTOK_OAUTH_URL);
    console.log("Using client key:", TIKTOK_CLIENT_ID);

    // Create FormData-like object with URLSearchParams
    const formData = new URLSearchParams();
    formData.append("client_key", TIKTOK_CLIENT_ID);
    formData.append("client_secret", TIKTOK_CLIENT_SECRET);
    formData.append("code", code);
    formData.append("grant_type", "authorization_code");
    formData.append("redirect_uri", TIKTOK_REDIRECT_URI);

    console.log("Request parameters formatted as form data");
    console.log("FULL TOKEN REQUEST BODY:", formData.toString());

    // Make the POST request with form data in the body, not as query parameters
    const response = await axios.post(TIKTOK_OAUTH_URL, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
    });

    console.log("TikTok token API response status:", response.status);
    console.log("TikTok token API response headers:", response.headers);

    // Log the response data, excluding sensitive information
    const sanitizedData = response.data
      ? {
          ...response.data,
          access_token: response.data.access_token
            ? "***REDACTED***"
            : undefined,
          refresh_token: response.data.refresh_token
            ? "***REDACTED***"
            : undefined,
        }
      : undefined;

    console.log(
      "TikTok token API response data:",
      JSON.stringify(sanitizedData, null, 2)
    );

    if (!response.data || !response.data.access_token) {
      console.error("Invalid token response:", response.data);
      throw new Error("Invalid response format from TikTok OAuth API");
    }

    console.log("Token data structure:", {
      keys: Object.keys(response.data),
      hasAccessToken: !!response.data.access_token,
      hasRefreshToken: !!response.data.refresh_token,
      hasOpenId: !!response.data.open_id,
      expiresIn: response.data.expires_in,
    });

    console.log(
      "========== TikTok getAccessToken Completed Successfully =========="
    );
    return response.data;
  } catch (error) {
    console.error("========== TikTok getAccessToken Failed ==========");
    console.error(
      "Error getting TikTok access token:",
      error.response?.data || error.message
    );
    console.error("Error details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data,
    });
    throw new Error(
      "Failed to get TikTok access token: " +
        (error.response?.data?.error_description ||
          error.response?.data?.error ||
          error.message)
    );
  }
}

// Export all methods
const tiktokService = {
  post,
  getAccessToken,
  getCreatorInfo,
  refreshTikTokToken,
  validateTikTokData,
};

export default tiktokService;
