/**
 * Instagram API Service
 * Handles all Instagram-specific API operations using Facebook Graph API
 */

import axios from "axios";

const GRAPH_API_VERSION = process.env.FACEBOOK_GRAPH_API_VERSION || "v19.0";

/**
 * Post content to Instagram Business Account
 *
 * @param {object} accountData - Instagram account data (token, platformAccountId, etc.)
 * @param {object} postData - Content data (caption, media, etc.)
 * @returns {Promise<object>} - Result of the Instagram API call
 */
async function post(accountData, postData) {
  console.log("Instagram post service called", { 
    platformAccountId: accountData.platformAccountId,
    mediaCount: postData.mediaFiles?.length 
  });

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
          accountData.platformAccountId,
          postData
        );
        break;
      case "carousel":
        result = await createCarouselPost(
          accessToken,
          accountData.platformAccountId,
          postData
        );
        break;
      case "video":
        result = await createVideoPost(
          accessToken,
          accountData.platformAccountId,
          postData
        );
        break;
      case "reels":
        result = await createReelsPost(
          accessToken,
          accountData.platformAccountId,
          postData
        );
        break;
      default:
        throw new Error(`Unsupported Instagram post type: ${postType}`);
    }

    return {
      postId: result.id,
      url: result.permalink_url || `https://www.instagram.com/p/${result.id}/`,
      status: "published",
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
  console.log("Refreshing Instagram token for account:", accountData.platformAccountId);

  try {
    // For Facebook/Instagram tokens, we can use the long-lived token to get a new long-lived token
    const response = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        fb_exchange_token: accountData.accessToken
      }
    });

    if (response.data && response.data.access_token) {
      // In a real implementation, you would update the database with the new token
      console.log("Successfully refreshed Instagram token");
      return response.data.access_token;
    } else {
      throw new Error("Failed to refresh token: Invalid response");
    }
  } catch (error) {
    console.error("Error refreshing Instagram token:", error);
    throw new Error(`Token refresh failed: ${error.message}`);
  }
}

/**
 * Create a single photo post on Instagram Business Account
 */
async function createSinglePhotoPost(accessToken, instagramAccountId, postData) {
  console.log("Creating single photo post on Instagram Business Account");

  try {
    const mediaFile = postData.mediaFiles[0];
    
    // Step 1: Create media container
    const containerResponse = await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramAccountId}/media`,
      {
        image_url: mediaFile.url || mediaFile.downloadURL,
        caption: postData.textContent || '',
        access_token: accessToken
      }
    );

    const containerId = containerResponse.data.id;
    console.log("Created media container:", containerId);

    // Step 2: Publish the media container
    const publishResponse = await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramAccountId}/media_publish`,
      {
        creation_id: containerId,
        access_token: accessToken
      }
    );

    console.log("Successfully published Instagram photo post:", publishResponse.data.id);
    
    return {
      id: publishResponse.data.id,
      permalink_url: `https://www.instagram.com/p/${publishResponse.data.id}/`
    };
  } catch (error) {
    console.error("Error creating Instagram photo post:", error.response?.data || error.message);
    throw new Error(`Instagram photo post failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Create a carousel post on Instagram Business Account
 */
async function createCarouselPost(accessToken, instagramAccountId, postData) {
  console.log(
    "Creating carousel post on Instagram with",
    postData.mediaFiles.length,
    "items"
  );

  try {
    // Step 1: Create media containers for each item
    const mediaContainers = [];
    
    for (const mediaFile of postData.mediaFiles) {
      const isVideo = mediaFile.type.startsWith('video/');
      const containerData = {
        access_token: accessToken
      };

      if (isVideo) {
        containerData.media_type = 'VIDEO';
        containerData.video_url = mediaFile.url || mediaFile.downloadURL;
      } else {
        containerData.image_url = mediaFile.url || mediaFile.downloadURL;
      }

      const containerResponse = await axios.post(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramAccountId}/media`,
        containerData
      );

      mediaContainers.push(containerResponse.data.id);
      console.log("Created media container:", containerResponse.data.id);
    }

    // Step 2: Create carousel container
    const carouselResponse = await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramAccountId}/media`,
      {
        media_type: 'CAROUSEL',
        children: mediaContainers.join(','),
        caption: postData.textContent || '',
        access_token: accessToken
      }
    );

    const carouselContainerId = carouselResponse.data.id;
    console.log("Created carousel container:", carouselContainerId);

    // Step 3: Publish the carousel
    const publishResponse = await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramAccountId}/media_publish`,
      {
        creation_id: carouselContainerId,
        access_token: accessToken
      }
    );

    console.log("Successfully published Instagram carousel post:", publishResponse.data.id);
    
    return {
      id: publishResponse.data.id,
      permalink_url: `https://www.instagram.com/p/${publishResponse.data.id}/`
    };
  } catch (error) {
    console.error("Error creating Instagram carousel post:", error.response?.data || error.message);
    throw new Error(`Instagram carousel post failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Create a video post on Instagram Business Account
 */
async function createVideoPost(accessToken, instagramAccountId, postData) {
  console.log("Creating video post on Instagram Business Account");

  try {
    const mediaFile = postData.mediaFiles[0];
    
    // Step 1: Create video media container
    const containerResponse = await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramAccountId}/media`,
      {
        media_type: 'VIDEO',
        video_url: mediaFile.url || mediaFile.downloadURL,
        caption: postData.textContent || '',
        access_token: accessToken
      }
    );

    const containerId = containerResponse.data.id;
    console.log("Created video media container:", containerId);

    // Step 2: Wait for video processing (check status)
    let processingComplete = false;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max wait time

    while (!processingComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      try {
        const statusResponse = await axios.get(
          `https://graph.facebook.com/${GRAPH_API_VERSION}/${containerId}`,
          {
            params: {
              fields: 'status_code',
              access_token: accessToken
            }
          }
        );

        if (statusResponse.data.status_code === 'FINISHED') {
          processingComplete = true;
        } else if (statusResponse.data.status_code === 'ERROR') {
          throw new Error('Video processing failed');
        }
      } catch (statusError) {
        console.warn("Error checking video status:", statusError.message);
      }
      
      attempts++;
    }

    if (!processingComplete) {
      throw new Error('Video processing timeout');
    }

    // Step 3: Publish the video
    const publishResponse = await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramAccountId}/media_publish`,
      {
        creation_id: containerId,
        access_token: accessToken
      }
    );

    console.log("Successfully published Instagram video post:", publishResponse.data.id);
    
    return {
      id: publishResponse.data.id,
      permalink_url: `https://www.instagram.com/p/${publishResponse.data.id}/`
    };
  } catch (error) {
    console.error("Error creating Instagram video post:", error.response?.data || error.message);
    throw new Error(`Instagram video post failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Create a reels post on Instagram Business Account
 */
async function createReelsPost(accessToken, instagramAccountId, postData) {
  console.log("Creating reels post on Instagram Business Account");

  try {
    const mediaFile = postData.mediaFiles[0];
    
    // Step 1: Create reels media container
    const containerResponse = await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramAccountId}/media`,
      {
        media_type: 'REELS',
        video_url: mediaFile.url || mediaFile.downloadURL,
        caption: postData.textContent || '',
        access_token: accessToken
      }
    );

    const containerId = containerResponse.data.id;
    console.log("Created reels media container:", containerId);

    // Step 2: Wait for video processing (check status)
    let processingComplete = false;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max wait time

    while (!processingComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      try {
        const statusResponse = await axios.get(
          `https://graph.facebook.com/${GRAPH_API_VERSION}/${containerId}`,
          {
            params: {
              fields: 'status_code',
              access_token: accessToken
            }
          }
        );

        if (statusResponse.data.status_code === 'FINISHED') {
          processingComplete = true;
        } else if (statusResponse.data.status_code === 'ERROR') {
          throw new Error('Reels processing failed');
        }
      } catch (statusError) {
        console.warn("Error checking reels status:", statusError.message);
      }
      
      attempts++;
    }

    if (!processingComplete) {
      throw new Error('Reels processing timeout');
    }

    // Step 3: Publish the reels
    const publishResponse = await axios.post(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramAccountId}/media_publish`,
      {
        creation_id: containerId,
        access_token: accessToken
      }
    );

    console.log("Successfully published Instagram reels post:", publishResponse.data.id);
    
    return {
      id: publishResponse.data.id,
      permalink_url: `https://www.instagram.com/p/${publishResponse.data.id}/`
    };
  } catch (error) {
    console.error("Error creating Instagram reels post:", error.response?.data || error.message);
    throw new Error(`Instagram reels post failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Get Instagram account info
 */
async function getAccountInfo(accessToken, instagramAccountId) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${instagramAccountId}`,
      {
        params: {
          fields: 'id,username,profile_picture_url,followers_count,media_count',
          access_token: accessToken
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error getting Instagram account info:", error.response?.data || error.message);
    throw new Error(`Failed to get account info: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Get Instagram media insights
 */
async function getMediaInsights(accessToken, mediaId) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}/insights`,
      {
        params: {
          metric: 'engagement,impressions,reach,saved',
          access_token: accessToken
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error getting Instagram media insights:", error.response?.data || error.message);
    throw new Error(`Failed to get media insights: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * Validate media URL accessibility
 */
async function validateMediaUrl(url) {
  try {
    const response = await axios.head(url, { timeout: 10000 });
    return response.status === 200;
  } catch (error) {
    console.error("Media URL validation failed:", error.message);
    return false;
  }
}

const instagramService = {
  post,
  getAccountInfo,
  getMediaInsights,
  validateMediaUrl,
  // Add other Instagram-specific methods as needed
};

export default instagramService;
