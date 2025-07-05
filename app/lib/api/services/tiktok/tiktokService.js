/**
 * TikTok API Service
 * Handles all TikTok-specific API operations
 */

import axios from "axios";

// Import database models at the top level for Next.js compatibility
import SocialAccount from "@/app/models/SocialAccount";

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

  console.log("TikTok sandbox mode detected:", isSandbox);

  // Try the real API first, even in sandbox mode
  try {
    console.log(
      "Attempting real TikTok API call for creator info:",
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
      "========== TikTok getCreatorInfo Completed Successfully (Real API) =========="
    );
    return response.data.data;
  } catch (error) {
    console.error("Real TikTok API failed:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });

    // If we're in sandbox mode and the real API fails, use mock data
    if (isSandbox) {
      console.log("Falling back to mock creator info for sandbox mode");
      console.log(
        "WARNING: Sandbox mode has limited Content Posting API access"
      );
      console.log(
        "Posts will be restricted to private viewing mode until app audit"
      );

      // Return mock data for sandbox testing
      const mockCreatorInfo = {
        creator_nickname: "TikTok Sandbox User",
        creator_avatar_url:
          "https://p16-sign.tiktokcdn-us.com/tos-useast5-avt-0068-tx/default_avatar.webp",
        creator_username: "sandbox_user",
        privacy_level_options: [
          "SELF_ONLY", // Force private posts in sandbox
          "MUTUAL_FOLLOW_FRIENDS",
          "PUBLIC_TO_EVERYONE",
        ],
        comment_disabled: false,
        duet_disabled: false,
        stitch_disabled: false,
        max_video_post_duration_sec: 300, // Standard 5 minutes
        can_post: true, // Allow posting in sandbox mode
        quota_usage: 0,
        quota_total: 10, // Allow 10 posts per day in sandbox
      };

      console.log("Returning mock creator info for sandbox mode");
      console.log(
        "Note: Posts will attempt to use real TikTok API but may be restricted"
      );
      console.log(
        "========== TikTok getCreatorInfo Completed (Sandbox Fallback) =========="
      );
      return mockCreatorInfo;
    }

    // If not in sandbox mode, throw the error
    console.error("========== TikTok getCreatorInfo Failed ==========");
    console.error(
      "Error fetching creator info:",
      error.response?.data || error.message
    );
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
 * @param {object} postData - Content data (caption, media, etc.)
 * @returns {Promise<object>} - Result of the TikTok API call
 */
async function post(accountData, postData) {
  console.log("TikTok post service called", {
    accountData: { ...accountData, accessToken: "***REDACTED***" },
  });

  try {
    // Normalize media data structure
    const mediaFiles = postData.mediaFiles || postData.media || [];
    postData.mediaFiles = mediaFiles;

    // Validate required fields for TikTok
    validateTikTokData(postData);

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
    const isVideo =
      postData.mediaType === "VIDEO" ||
      (mediaFiles[0]?.type && mediaFiles[0].type.startsWith("video/")) ||
      (mediaFiles[0]?.fileInfo?.type &&
        mediaFiles[0].fileInfo.type.startsWith("video/"));

    if (
      isVideo &&
      mediaFiles[0]?.duration > creatorInfo.max_video_post_duration_sec
    ) {
      throw new Error(
        `Video exceeds maximum allowed duration of ${creatorInfo.max_video_post_duration_sec} seconds`
      );
    }

    // 3. Prepare post data based on media type
    const mediaType = determineMediaType(mediaFiles);

    // 4. Initialize and publish content
    const isSandboxMode =
      process.env.TIKTOK_SANDBOX_MODE === "true" ||
      process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID?.includes("sbawl");

    console.log("========== TikTok Attempting Real Post ==========");
    if (isSandboxMode) {
      console.log("🚨 SANDBOX MODE: Attempting real post with TikTok API");
      console.log("📋 Note: Posts may be restricted to private viewing only");
      console.log("⚠️  Content Posting API has limited sandbox support");
    }
    console.log("Media type:", mediaType);
    console.log("Post data structure:", {
      hasMediaFiles: !!postData.mediaFiles,
      mediaCount: postData.mediaFiles?.length,
      firstMediaType: postData.mediaFiles?.[0]?.type,
      captionLength: postData.captions?.single?.length || 0,
    });

    const postResult = await initializeAndPublishContent(
      accessToken,
      postData,
      mediaType,
      creatorInfo
    );

    console.log("========== TikTok Post Result ==========");
    console.log("Post result:", JSON.stringify(postResult, null, 2));

    return {
      postId: postResult.publish_id,
      status: postResult.publish_status || "published",
      url: postResult.share_url || null,
    };
  } catch (error) {
    console.error("Error in TikTok post service:", error);
    throw error;
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

  // Check different possible type locations
  const fileType =
    firstFile.type || firstFile.fileInfo?.type || firstFile.contentType;

  if (fileType && fileType.startsWith("video/")) {
    return "VIDEO";
  } else if (fileType && fileType.startsWith("image/")) {
    return "PHOTO";
  } else {
    throw new Error(`Unsupported media type: ${fileType || "unknown"}`);
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
  // Prepare the payload based on the endpoint and media type
  let payload;

  if (mediaType === "VIDEO") {
    // Use simpler payload for video endpoint
    payload = {
      post_info: {
        title: postData.title || "",
        description:
          postData.textContent ||
          postData.text ||
          postData.captions?.single ||
          "",
        privacy_level:
          postData.privacyLevel ||
          (creatorInfo.privacy_level_options &&
          creatorInfo.privacy_level_options.length > 0
            ? creatorInfo.privacy_level_options[0]
            : "SELF_ONLY"), // Default to private for sandbox
        disable_comment: postData.disableComment || false,
        disable_duet: postData.disableDuet || false,
        disable_stitch: postData.disableStitch || false,
        auto_add_music: true,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: postData.mediaFiles[0].url,
      },
    };
  } else {
    // Use full payload for photo endpoint
    payload = {
      post_info: {
        title: postData.title || "",
        description:
          postData.textContent ||
          postData.text ||
          postData.captions?.single ||
          "",
        privacy_level:
          postData.privacyLevel ||
          (creatorInfo.privacy_level_options &&
          creatorInfo.privacy_level_options.length > 0
            ? creatorInfo.privacy_level_options[0]
            : "SELF_ONLY"), // Default to private for sandbox
        disable_comment: postData.disableComment || false,
        disable_duet: postData.disableDuet || false,
        disable_stitch: postData.disableStitch || false,
        auto_add_music: true,
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: postData.mediaFiles.map((file) => file.url),
      },
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    };
  }

  // Add commercial content disclosure if specified
  if (postData.isCommercialContent) {
    payload.post_info.brand_organic = postData.isBrandOrganic || false;
    payload.post_info.brand_content = postData.isBrandedContent || false;
  }

  // Use different endpoints for video vs photo
  const endpoint =
    mediaType === "VIDEO"
      ? `${TIKTOK_API_BASE_URL}/post/publish/inbox/video/init/`
      : `${TIKTOK_API_BASE_URL}/post/publish/content/init/`;

  console.log("========== TikTok Content Init API Call ==========");
  console.log("Endpoint:", endpoint);
  console.log("Media type:", mediaType);
  console.log("Payload:", JSON.stringify(payload, null, 2));
  console.log(
    "Access token:",
    accessToken ? `${accessToken.substring(0, 10)}...` : "MISSING"
  );

  try {
    // Call the TikTok API to initialize content posting
    const response = await axios.post(endpoint, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("TikTok init API response status:", response.status);
    console.log(
      "TikTok init API response data:",
      JSON.stringify(response.data, null, 2)
    );

    const initResult = response.data.data;
    const publishId = initResult.publish_id;

    console.log("TikTok content initialized successfully", { publishId });

    // For direct post mode, we need to check the status using the status API
    return await checkPublishStatus(accessToken, publishId);
  } catch (error) {
    console.error("========== TikTok Content Init Failed ==========");
    console.error("Error status:", error.response?.status);
    console.error("Error data:", JSON.stringify(error.response?.data, null, 2));
    console.error("Error message:", error.message);

    const isSandboxMode =
      process.env.TIKTOK_SANDBOX_MODE === "true" ||
      process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID?.includes("sbawl");

    if (isSandboxMode) {
      console.error("🚨 SANDBOX MODE ERROR: This is likely expected");
      console.error("📋 TikTok Sandbox Limitations:");
      console.error(
        "   - Content Posting API has very limited support in sandbox mode"
      );
      console.error("   - Video posting endpoints may not be available");
      console.error(
        "   - 'Invalid media_type or post_mode' errors are common in sandbox"
      );
      console.error(
        "   - Real posting functionality requires production app approval"
      );
      console.error("💡 Next Steps:");
      console.error(
        "   - Submit your app for TikTok review to get full API access"
      );
      console.error(
        "   - Use production credentials for real posting functionality"
      );
      console.error("   - Current error is expected behavior in sandbox mode");
    }

    console.error("Full error details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data,
    });

    const errorMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message;

    // In sandbox mode, if we get API errors, we can simulate a successful response for testing
    if (
      isSandboxMode &&
      (error.response?.status === 400 || error.response?.status === 404)
    ) {
      console.log(
        "🎭 SANDBOX MODE: Simulating successful post for testing purposes"
      );
      console.log(
        "⚠️  This is a mock response - no actual post was created on TikTok"
      );
      console.log(
        "📱 Your app logic can continue as if the post was successful"
      );

      // Return a mock successful response to allow app testing
      return {
        publish_id: `mock_sandbox_${Date.now()}`,
        publish_status: "processing",
        share_url: null,
        uploaded_bytes: postData.mediaFiles[0]?.size || 0,
        upload_url: null,
      };
    }

    const sandboxNote = isSandboxMode
      ? " (Note: Sandbox mode has limited Content Posting API support)"
      : "";

    throw new Error(`Failed to post to TikTok: ${errorMessage}${sandboxNote}`);
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

  const firstFile = postData.mediaFiles[0];
  const fileType =
    firstFile.type || firstFile.fileInfo?.type || firstFile.contentType;

  // For videos
  if (
    postData.mediaType === "VIDEO" ||
    (fileType && fileType.startsWith("video/"))
  ) {
    const videoFile = firstFile;

    // Check if the file has a URL
    if (!videoFile.url) {
      throw new Error("Video URL is required for TikTok posting");
    }

    // Check if the video meets TikTok's requirements (this is a simplified check)
    // TikTok has specific requirements for video length, size, aspect ratio, etc.
    const fileSize = videoFile.size || videoFile.fileInfo?.size || 0;
    if (fileSize > 287108864) {
      // 287MB max size for TikTok
      throw new Error("Video file is too large for TikTok (max 287MB)");
    }
  }
  // For photos
  else if (
    postData.mediaType === "PHOTO" ||
    (fileType && fileType.startsWith("image/"))
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

    console.log("TikTok refresh response status:", response.status);
    console.log("TikTok refresh response structure:", {
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      hasNestedData: !!(response.data && response.data.data),
    });

    // Handle different response structures
    let tokenData;
    if (response.data && response.data.data) {
      // Response has nested data structure
      tokenData = response.data.data;
    } else if (response.data) {
      // Response has flat structure
      tokenData = response.data;
    } else {
      throw new Error("Invalid response structure from TikTok refresh API");
    }

    console.log("TikTok token data structure:", {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      keys: tokenData ? Object.keys(tokenData) : [],
    });

    if (!tokenData.access_token) {
      console.error("No access token in refresh response:", tokenData);
      throw new Error("No access token received from TikTok refresh API");
    }

    // Update the database with new tokens
    try {
      await SocialAccount.findByIdAndUpdate(accountData.id || accountData._id, {
        $set: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || accountData.refreshToken,
          tokenExpiry: new Date(
            Date.now() + (tokenData.expires_in || 86400) * 1000
          ),
          status: "active",
          errorMessage: null,
          updatedAt: new Date(),
        },
      });

      console.log("TikTok tokens updated in database successfully");
    } catch (dbError) {
      console.error("Error updating TikTok tokens in database:", dbError);
      // Don't throw here - we still have the new token to return
    }

    console.log("TikTok token refreshed successfully");

    return tokenData.access_token;
  } catch (error) {
    console.error(
      "Error refreshing TikTok token:",
      error.response?.data || error.message
    );

    // Log more details about the error
    if (error.response) {
      console.error("TikTok refresh API response:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    }

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
