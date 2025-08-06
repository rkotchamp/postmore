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
  console.log("🔍 LINKEDIN: Service called");
  console.log("🔍 LINKEDIN: accountData:", JSON.stringify(accountData, null, 2));
  console.log("🔍 LINKEDIN: postData:", JSON.stringify(postData, null, 2));

  try {
    // Validate required fields for LinkedIn
    validateLinkedInData(postData);

    // Get a fresh access token if needed
    const accessToken = await ensureFreshToken(accountData);

    // Get the appropriate caption/text content based on mode (like BlueSky)
    let postText = "";
    console.log("🔍 LINKEDIN: Processing captions, contentType:", postData.contentType);
    
    if (postData.contentType === "text") {
      postText = postData.text || "";
      console.log("🔍 LINKEDIN: Text post, postText:", postText);
    } else if (postData.contentType === "media") {
      console.log("🔍 LINKEDIN: Media post, captions:", JSON.stringify(postData.captions, null, 2));
      if (postData.captions?.mode === "single") {
        postText = postData.captions.single || "";
        console.log("🔍 LINKEDIN: Single caption mode, postText:", postText);
      } else if (postData.captions?.mode === "multiple") {
        postText =
          postData.captions?.multiple?.[accountData.id] ||
          postData.captions?.single ||
          "";
        console.log("🔍 LINKEDIN: Multiple caption mode, accountData.id:", accountData.id);
        console.log("🔍 LINKEDIN: Multiple caption mode, postText:", postText);
      }
    }
    
    // Also check legacy textContent field for backwards compatibility
    if (!postText && postData.textContent) {
      postText = postData.textContent;
      console.log("🔍 LINKEDIN: Using legacy textContent:", postText);
    }
    
    console.log("🔍 LINKEDIN: Final postText:", postText);

    // Determine what type of post this is
    const postType = determinePostType(postData.mediaFiles);

    // Create the post based on type
    let result;

    // Create post data with processed text
    const processedPostData = {
      ...postData,
      textContent: postText,
    };

    switch (postType) {
      case "text":
        result = await createTextPost(accessToken, accountData, processedPostData);
        break;
      case "image":
        result = await createImagePost(accessToken, accountData, processedPostData);
        break;
      case "video":
        result = await createVideoPost(accessToken, accountData, processedPostData);
        break;
      case "article":
        result = await createArticlePost(accessToken, accountData, processedPostData);
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
    
    // LinkedIn supports video uploads via Videos API
    if (file.type.startsWith("video/")) {
      return "video";
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
  // Check if we have any content (text, captions, or media)
  const hasTextContent = postData.textContent || postData.text;
  const hasCaptions = postData.captions && (postData.captions.single || (postData.captions.multiple && Object.keys(postData.captions.multiple).length > 0));
  const hasMedia = postData.mediaFiles && postData.mediaFiles.length > 0;

  // LinkedIn requires either text content or media
  if (!hasTextContent && !hasCaptions && !hasMedia) {
    throw new Error("LinkedIn posts require either text content or media");
  }

  // LinkedIn text content limit (3,000 characters for posts)
  // Check both textContent and caption content
  if (postData.textContent && postData.textContent.length > 3000) {
    throw new Error("LinkedIn posts cannot exceed 3,000 characters");
  }

  if (postData.captions?.single && postData.captions.single.length > 3000) {
    throw new Error("LinkedIn posts cannot exceed 3,000 characters");
  }

  if (postData.captions?.multiple) {
    for (const caption of Object.values(postData.captions.multiple)) {
      if (caption && caption.length > 3000) {
        throw new Error("LinkedIn posts cannot exceed 3,000 characters");
      }
    }
  }

  // Validate media files if present
  if (postData.mediaFiles && postData.mediaFiles.length > 0) {
    for (const file of postData.mediaFiles) {
      if (!file.type) {
        throw new Error(`LinkedIn: File type is required for ${file.originalName || 'uploaded file'}`);
      }
      
      // LinkedIn supports images and videos
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        // Video size validation (LinkedIn limit: 500MB)
        if (file.type.startsWith("video/") && file.size && file.size > 500 * 1024 * 1024) {
          throw new Error(`LinkedIn: Video file too large. Maximum size is 500MB.`);
        }
        continue;
      }
      
      throw new Error(`Unsupported file type for LinkedIn: ${file.type}. Only images and videos are supported.`);
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
        shareMediaCategory: "NONE",
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
        shareMediaCategory: "IMAGE",
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
    // Get image data from URL since we don't have buffer
    let imageBuffer;
    
    if (imageFile.buffer) {
      console.log("🔍 LINKEDIN: Using existing buffer");
      imageBuffer = imageFile.buffer;
    } else if (imageFile.url) {
      console.log("🔍 LINKEDIN: Downloading image from URL:", imageFile.url);
      const response = await axios.get(imageFile.url, { responseType: 'arraybuffer' });
      imageBuffer = Buffer.from(response.data);
    } else {
      throw new Error("No image data or URL available");
    }
    
    await axios.put(uploadUrl, imageBuffer, {
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });
  } catch (error) {
    console.error("LinkedIn image upload failed:", error);
    throw new Error(`LinkedIn image upload failed: ${error.message}`);
  }
}

/**
 * Create a video post on LinkedIn using Videos API
 */
async function createVideoPost(accessToken, accountData, postData) {
  console.log("🔍 LINKEDIN: Creating video post");
  
  const videoFile = postData.mediaFiles[0];
  console.log("🔍 LINKEDIN: Video file full structure:", JSON.stringify(videoFile, null, 2));
  console.log("🔍 LINKEDIN: Video file keys:", Object.keys(videoFile));
  console.log("🔍 LINKEDIN: Has buffer?", !!videoFile.buffer);
  console.log("🔍 LINKEDIN: Has file?", !!videoFile.file);
  console.log("🔍 LINKEDIN: Has blob?", !!videoFile.blob);
  console.log("🔍 LINKEDIN: Has data?", !!videoFile.data);

  try {
    // Step 1: Get video data (check for existing buffer first, then download if needed)
    let videoBuffer;
    let fileSizeBytes;
    
    if (videoFile.buffer) {
      console.log("🔍 LINKEDIN: Using existing buffer");
      videoBuffer = videoFile.buffer;
      fileSizeBytes = videoBuffer.length;
    } else if (videoFile.data) {
      console.log("🔍 LINKEDIN: Using existing data");
      videoBuffer = Buffer.isBuffer(videoFile.data) ? videoFile.data : Buffer.from(videoFile.data);
      fileSizeBytes = videoBuffer.length;
    } else if (videoFile.url) {
      console.log("🔍 LINKEDIN: Downloading from URL:", videoFile.url);
      const videoResponse = await axios.get(videoFile.url, { 
        responseType: 'arraybuffer',
        timeout: 60000 // 60 second timeout for large videos
      });
      videoBuffer = Buffer.from(videoResponse.data);
      fileSizeBytes = videoBuffer.length;
    } else {
      throw new Error("No video data or URL available");
    }
    
    console.log("🔍 LINKEDIN: Video data ready, size:", fileSizeBytes);

    // Step 2: Initialize video upload
    console.log("🔍 LINKEDIN: Initializing video upload...");
    let initResponse;
    try {
      initResponse = await axios.post(
        'https://api.linkedin.com/rest/videos?action=initializeUpload',
        {
          initializeUploadRequest: {
            owner: `urn:li:person:${accountData.platformAccountId}`,
            fileSizeBytes: fileSizeBytes,
            uploadCaptions: false,
            uploadThumbnail: false
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'LinkedIn-Version': '202501',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
    } catch (error) {
      console.error("🔍 LINKEDIN: Video initialization failed:");
      console.error("🔍 LINKEDIN: Init error status:", error.response?.status);
      console.error("🔍 LINKEDIN: Init error data:", JSON.stringify(error.response?.data, null, 2));
      throw new Error(`LinkedIn video initialization failed: ${error.response?.data?.message || error.message}`);
    }

    const { value: uploadData } = initResponse.data;
    const videoUrn = uploadData.video;
    const uploadToken = uploadData.uploadToken;
    const uploadInstructions = uploadData.uploadInstructions;
    
    console.log("🔍 LINKEDIN: Video upload initialized, URN:", videoUrn);
    console.log("🔍 LINKEDIN: Upload instructions:", JSON.stringify(uploadInstructions, null, 2));

    // Step 3: Upload video in parts (4MB chunks)
    const chunkSize = 4 * 1024 * 1024; // 4MB
    const uploadedParts = [];
    
    for (let i = 0; i < uploadInstructions.length; i++) {
      const instruction = uploadInstructions[i];
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileSizeBytes);
      const chunk = videoBuffer.slice(start, end);
      
      console.log(`🔍 LINKEDIN: Uploading part ${i + 1}/${uploadInstructions.length}, bytes ${start}-${end}`);
      console.log(`🔍 LINKEDIN: Instruction for part ${i + 1}:`, JSON.stringify(instruction, null, 2));
      
      const uploadResponse = await axios.put(instruction.uploadUrl, chunk, {
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      });
      
      // LinkedIn requires us to use the ETag as the part ID for signed uploads
      const partId = uploadResponse.headers.etag;
      console.log(`🔍 LINKEDIN: Part ${i + 1} uploaded, partId:`, partId, "etag:", uploadResponse.headers.etag);
      
      uploadedParts.push({
        uploadPartId: partId,
        etag: uploadResponse.headers.etag
      });
    }
    
    console.log("🔍 LINKEDIN: Final uploadedParts:", JSON.stringify(uploadedParts, null, 2));

    console.log("🔍 LINKEDIN: All parts uploaded, finalizing...");

    // Step 4: Finalize upload
    try {
      await axios.post(
        'https://api.linkedin.com/rest/videos?action=finalizeUpload',
        {
          finalizeUploadRequest: {
            video: videoUrn,
            uploadToken: uploadToken,
            uploadedPartIds: uploadedParts.map(part => part.uploadPartId)
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'LinkedIn-Version': '202501',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );
    } catch (error) {
      console.error("🔍 LINKEDIN: Video finalization failed:");
      console.error("🔍 LINKEDIN: Finalize error status:", error.response?.status);
      console.error("🔍 LINKEDIN: Finalize error data:", JSON.stringify(error.response?.data, null, 2));
      throw new Error(`LinkedIn video finalization failed: ${error.response?.data?.message || error.message}`);
    }

    console.log("🔍 LINKEDIN: Video upload finalized");

    // Step 5: Create post with video URN using newer Posts API for consistency
    const postBody = {
      author: `urn:li:person:${accountData.platformAccountId}`,
      commentary: postData.textContent || "",
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      content: {
        media: {
          title: videoFile.originalName || "Video",
          id: videoUrn
        }
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false
    };

    console.log("🔍 LINKEDIN: Creating post with video URN:", videoUrn);
    console.log("🔍 LINKEDIN: Post body:", JSON.stringify(postBody, null, 2));

    const postResponse = await axios.post(
      'https://api.linkedin.com/rest/posts',
      postBody,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'LinkedIn-Version': '202501',
          'X-Restli-Protocol-Version': '2.0.0'
        }
      }
    );

    console.log("🔍 LINKEDIN: Video post created successfully");

    return {
      id: postResponse.data.id,
      permalink: `https://www.linkedin.com/posts/${accountData.platformAccountId}_${postResponse.data.id}`
    };

  } catch (error) {
    console.error("🔍 LINKEDIN: Video post creation failed:");
    console.error("🔍 LINKEDIN: Error status:", error.response?.status);
    console.error("🔍 LINKEDIN: Error headers:", error.response?.headers);
    console.error("🔍 LINKEDIN: Error data:", JSON.stringify(error.response?.data, null, 2));
    console.error("🔍 LINKEDIN: Error message:", error.message);
    
    // Create detailed error message
    let errorMessage = `LinkedIn video post failed: ${error.message}`;
    if (error.response?.data) {
      if (error.response.data.message) {
        errorMessage = `LinkedIn video post failed: ${error.response.data.message}`;
      } else if (error.response.data.error_description) {
        errorMessage = `LinkedIn video post failed: ${error.response.data.error_description}`;
      } else if (error.response.data.errorDetailType) {
        errorMessage = `LinkedIn video post failed: ${error.response.data.errorDetailType}`;
      }
    }
    
    throw new Error(errorMessage);
  }
}

const linkedinService = {
  post,
  // Add other LinkedIn-specific methods as needed
};

export default linkedinService;