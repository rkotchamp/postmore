/**
 * LinkedIn API Service
 * Handles all LinkedIn-specific API operations
 */

import axios from "axios";

/**
 * Post content to LinkedIn
 *
 * @param {object} accountData - LinkedIn account data (token, user ID, etc.)
 * @param {object} postData - Content data (text, media, etc.)
 * @returns {Promise<object>} - Result of the LinkedIn API call
 */
async function post(accountData, postData) {
  console.log("LinkedIn post service called", { accountData, postData });

  try {
    // Validate required fields for LinkedIn
    validateLinkedInData(postData);

    // Get a fresh access token if needed
    const accessToken = await ensureFreshToken(accountData);

    // Determine what type of post this is
    const postType = determinePostType(postData.mediaFiles);

    // Create the post based on type
    let result;

    switch (postType) {
      case "text":
        result = await createTextPost(accessToken, accountData, postData);
        break;
      case "image":
        result = await createImagePost(accessToken, accountData, postData);
        break;
      case "article":
        result = await createArticlePost(accessToken, accountData, postData);
        break;
      default:
        throw new Error(`Unsupported LinkedIn post type: ${postType}`);
    }

    return {
      postId: result.id,
      url: result.permalink || `https://www.linkedin.com/feed/update/urn:li:share:${result.id}`,
      status: result.lifecycleState || "published",
    };
  } catch (error) {
    console.error("Error in LinkedIn post service:", error);
    throw error;
  }
}

/**
 * Determine the type of LinkedIn post based on content and media files
 *
 * @param {Array<object>} mediaFiles - The media files to post
 * @returns {string} - The type of post ('text', 'image', 'article')
 */
function determinePostType(mediaFiles) {
  // If no media files, it's a text post
  if (!mediaFiles || mediaFiles.length === 0) {
    return "text";
  }

  // LinkedIn supports single image posts
  if (mediaFiles.length === 1) {
    const file = mediaFiles[0];
    
    if (file.type.startsWith("image/")) {
      return "image";
    }
    
    // LinkedIn doesn't support direct video uploads via API for most users
    if (file.type.startsWith("video/")) {
      throw new Error("Video uploads are not supported for LinkedIn posts via API");
    }
  }

  // LinkedIn doesn't support multiple images in a single post via API
  if (mediaFiles.length > 1) {
    throw new Error("LinkedIn doesn't support multiple media files in a single post");
  }

  return "text";
}

/**
 * Validate the data required for LinkedIn posting
 *
 * @param {object} postData - The data to validate
 * @throws {Error} If required fields are missing
 */
function validateLinkedInData(postData) {
  // LinkedIn requires either text content or media
  if (!postData.textContent && (!postData.mediaFiles || postData.mediaFiles.length === 0)) {
    throw new Error("LinkedIn posts require either text content or media");
  }

  // LinkedIn text content limit (3,000 characters for posts)
  if (postData.textContent && postData.textContent.length > 3000) {
    throw new Error("LinkedIn posts cannot exceed 3,000 characters");
  }

  // Validate media files if present
  if (postData.mediaFiles && postData.mediaFiles.length > 0) {
    for (const file of postData.mediaFiles) {
      if (!file.type || !file.type.startsWith("image/")) {
        throw new Error(`Unsupported file type for LinkedIn: ${file.type}. Only images are supported.`);
      }
    }
  }
}

/**
 * Ensure we have a fresh access token for the LinkedIn API
 *
 * @param {object} accountData - Account data with tokens
 * @returns {Promise<string>} - A valid access token
 */
async function ensureFreshToken(accountData) {
  if (!accountData.accessToken) {
    throw new Error("No access token available for this LinkedIn account");
  }

  // Check if token is expired and refresh if needed
  if (isTokenExpired(accountData)) {
    return await refreshLinkedInToken(accountData);
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
  if (!accountData.tokenExpiresAt) return false; // LinkedIn tokens don't expire by default

  // Add a buffer of 5 minutes
  const expiryTime = new Date(accountData.tokenExpiresAt).getTime() - 5 * 60 * 1000;
  return Date.now() > expiryTime;
}

/**
 * Refresh the LinkedIn access token
 *
 * @param {object} accountData - Account data with refresh token
 * @returns {Promise<string>} - New access token
 */
async function refreshLinkedInToken(accountData) {
  console.log("Refreshing LinkedIn token for account:", accountData.platformAccountId);

  if (!accountData.refreshToken) {
    throw new Error("No refresh token available for LinkedIn account");
  }

  try {
    const response = await axios.post("https://www.linkedin.com/oauth/v2/accessToken", {
      grant_type: "refresh_token",
      refresh_token: accountData.refreshToken,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    }, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const { access_token, refresh_token } = response.data;

    // Update the account data in the database with new tokens
    // This would require a database update call here
    console.log("LinkedIn token refreshed successfully");

    return access_token;
  } catch (error) {
    console.error("Failed to refresh LinkedIn token:", error);
    throw new Error("Failed to refresh LinkedIn access token");
  }
}

/**
 * Create a text-only post on LinkedIn
 */
async function createTextPost(accessToken, accountData, postData) {
  console.log("Creating text post on LinkedIn");

  const postBody = {
    author: `urn:li:person:${accountData.platformAccountId}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: postData.textContent,
        },
        media: [],
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  try {
    const response = await axios.post(
      "https://api.linkedin.com/v2/ugcPosts",
      postBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );

    return {
      id: response.data.id,
      lifecycleState: response.data.lifecycleState,
    };
  } catch (error) {
    console.error("LinkedIn text post creation failed:", error);
    throw new Error(`LinkedIn post failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Create an image post on LinkedIn
 */
async function createImagePost(accessToken, accountData, postData) {
  console.log("Creating image post on LinkedIn");

  // First, register the image upload
  const registerResponse = await registerImageUpload(accessToken, accountData.platformAccountId);
  
  // Upload the image
  const imageFile = postData.mediaFiles[0];
  await uploadImage(registerResponse.value.uploadMechanism, imageFile);

  // Create the post with the uploaded image
  const postBody = {
    author: `urn:li:person:${accountData.platformAccountId}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: postData.textContent || "",
        },
        media: [
          {
            status: "READY",
            description: {
              text: postData.textContent || "",
            },
            media: registerResponse.value.asset,
            title: {
              text: "Image Post",
            },
          },
        ],
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  try {
    const response = await axios.post(
      "https://api.linkedin.com/v2/ugcPosts",
      postBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );

    return {
      id: response.data.id,
      lifecycleState: response.data.lifecycleState,
    };
  } catch (error) {
    console.error("LinkedIn image post creation failed:", error);
    throw new Error(`LinkedIn image post failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Create an article post on LinkedIn (for future use)
 */
async function createArticlePost(accessToken, accountData, postData) {
  console.log("Creating article post on LinkedIn");
  
  // Article posting would require additional implementation
  throw new Error("Article posting is not yet implemented for LinkedIn");
}

/**
 * Register an image upload with LinkedIn
 */
async function registerImageUpload(accessToken, personId) {
  const registerBody = {
    registerUploadRequest: {
      recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
      owner: `urn:li:person:${personId}`,
      serviceRelationships: [
        {
          relationshipType: "OWNER",
          identifier: "urn:li:userGeneratedContent",
        },
      ],
    },
  };

  try {
    const response = await axios.post(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      registerBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("LinkedIn image registration failed:", error);
    throw new Error(`LinkedIn image registration failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Upload image to LinkedIn
 */
async function uploadImage(uploadMechanism, imageFile) {
  const uploadUrl = uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
  
  try {
    await axios.put(uploadUrl, imageFile.buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });
  } catch (error) {
    console.error("LinkedIn image upload failed:", error);
    throw new Error(`LinkedIn image upload failed: ${error.message}`);
  }
}

const linkedinService = {
  post,
  // Add other LinkedIn-specific methods as needed
};

export default linkedinService;