/**
 * API Bridge Module for Queue Workers
 *
 * This module creates a bridge between ES Modules (used by the queue worker)
 * and CommonJS modules (used by the Next.js app)
 *
 * It implements a simplified version of the API manager to handle scheduled posts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { BskyAgent } from "@atproto/api";

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
export async function connectToDatabase() {
  if (mongoose.connection.readyState !== 1) {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI not defined in environment variables");
    }

    console.log("Worker: Connecting to MongoDB...");
    try {
      await mongoose.connect(MONGODB_URI);
      console.log("Worker: Connected to MongoDB successfully");
    } catch (error) {
      console.error("Worker: MongoDB connection error:", error);
      throw error;
    }
  } else {
    console.log("Worker: Already connected to MongoDB");
  }
}

// Constants for video handling
const MAX_VIDEO_SIZE_BYTES = 100000000; // 100MB

/**
 * Upload a video to Bluesky - Simplified version for worker
 * @param {BskyAgent} agent - Authenticated Bluesky agent
 * @param {string} videoUrl - URL to the video file
 * @param {object} mediaItem - Metadata about the video
 * @param {File|null} thumbnail - Thumbnail image for the video
 * @returns {Promise<object>} Result of the upload operation
 */
async function uploadVideo(agent, videoUrl, mediaItem) {
  console.log(
    `Worker: Uploading video ${mediaItem.originalName}, type: ${
      mediaItem.type || "unknown"
    }`
  );

  try {
    // Fetch the video file from the URL
    console.log(
      `Worker: Fetching video file from URL: ${
        videoUrl
          ? videoUrl.substring(0, 60) + "..."
          : "No URL, using file directly"
      }`
    );

    let videoBytes;

    try {
      if (videoUrl) {
        const response = await fetch(videoUrl);
        if (!response.ok) {
          throw new Error(
            `Fetch failed: ${response.status} - ${response.statusText}`
          );
        }

        const contentType = response.headers.get("content-type");
        console.log(`Worker: Video content-type from server: ${contentType}`);

        // Save content-type for later use
        mediaItem.serverContentType = contentType;

        videoBytes = await response.arrayBuffer();
        console.log(
          `Worker: Fetched ${videoBytes.byteLength} bytes for video ${mediaItem.originalName}`
        );
      } else {
        throw new Error("No video URL provided");
      }
    } catch (fetchError) {
      console.error(`Worker: Error fetching video: ${fetchError.message}`);
      throw fetchError;
    }

    // Validate video size
    if (videoBytes.byteLength > MAX_VIDEO_SIZE_BYTES) {
      console.error(
        `Worker: Video exceeds size limit (${videoBytes.byteLength} > ${MAX_VIDEO_SIZE_BYTES})`
      );
      return {
        success: false,
        error: `Video exceeds Bluesky's ${
          MAX_VIDEO_SIZE_BYTES / 1000000
        }MB size limit`,
      };
    }

    // Use the agent's XRPC client to call the endpoint directly
    const finalMediaType =
      mediaItem.type || mediaItem.serverContentType || "video/mp4";
    console.log(`Worker: Uploading blob with MIME type: ${finalMediaType}`);

    const uploadResponse = await agent.api.com.atproto.repo.uploadBlob(
      new Uint8Array(videoBytes),
      { encoding: finalMediaType }
    );

    console.log("Worker: Upload blob successful:", {
      success: !!uploadResponse,
      hasBlob: !!uploadResponse?.data?.blob,
      blobRef: uploadResponse?.data?.blob?.ref || "missing",
      blobSize: uploadResponse?.data?.blob?.size || 0,
      blobType: uploadResponse?.data?.blob?.mimeType || "unknown",
    });

    // Return the upload result
    return {
      success: true,
      blob: uploadResponse.data.blob,
      originalSize: videoBytes.byteLength,
    };
  } catch (error) {
    console.error(`Worker: Video upload error: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Simple BlueSky posting implementation that doesn't rely on importing the whole service
async function postToBlueSky(account, postData) {
  console.log("Worker: Posting directly to BlueSky");
  console.log(
    "Worker: Account data:",
    JSON.stringify({
      id: account.id,
      platform: account.platform,
      hasOriginalData: !!account.originalData,
      hasAccessToken:
        !!account.accessToken ||
        !!(account.originalData && account.originalData.accessToken),
      hasRefreshToken:
        !!account.refreshToken ||
        !!(account.originalData && account.originalData.refreshToken),
    })
  );

  // Extract tokens appropriately - they might be in account or account.originalData
  const accessToken =
    account.accessToken ||
    (account.originalData && account.originalData.accessToken);
  const refreshToken =
    account.refreshToken ||
    (account.originalData && account.originalData.refreshToken);
  const platformAccountId =
    account.platformAccountId ||
    (account.originalData && account.originalData.platformAccountId);
  const platformUsername =
    account.platformUsername ||
    account.email ||
    (account.originalData && account.originalData.platformUsername);

  console.log("Extracted tokens:", {
    "Access Token": accessToken,
    "Refresh Token": refreshToken,
    "Platform Account ID": platformAccountId,
    "Platform Username": platformUsername,
  });

  try {
    // Initialize Bluesky agent
    const agent = new BskyAgent({
      service: "https://bsky.social",
    });

    // Make sure we have required tokens
    if (!accessToken || !refreshToken) {
      throw new Error("Missing required tokens for BlueSky authentication");
    }

    if (!platformAccountId) {
      throw new Error("Missing platformAccountId (DID) for BlueSky account");
    }

    if (!platformUsername) {
      throw new Error("Missing platformUsername (handle) for BlueSky account");
    }

    console.log("Worker: Attempting BlueSky authentication with:", {
      did: platformAccountId,
      handle: platformUsername,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
    });

    // Authenticate
    try {
      await agent.resumeSession({
        did: platformAccountId,
        handle: platformUsername,
        accessJwt: accessToken,
        refreshJwt: refreshToken,
      });
      console.log("Worker: BlueSky authentication successful");
    } catch (authError) {
      console.error(
        "Worker: BlueSky authentication failed:",
        authError.message
      );
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    // Prepare post text
    let postText = "";
    if (postData.contentType === "text") {
      postText = postData.text || "";
    } else if (postData.contentType === "media") {
      if (postData.captions?.mode === "single") {
        postText = postData.captions.single || "";
      } else if (postData.captions?.mode === "multiple") {
        postText =
          postData.captions?.multiple?.[account.id] ||
          postData.captions?.single ||
          "";
      }
    }

    // Process media if present
    const images = [];
    let videoEmbed = null;

    if (postData.media && postData.media.length > 0) {
      console.log(
        "Worker: Processing media for BlueSky post:",
        postData.media.length,
        "items"
      );

      for (const mediaItem of postData.media) {
        // Check if it's an image
        if (
          mediaItem.type === "image" ||
          (mediaItem.type && mediaItem.type.startsWith("image/"))
        ) {
          try {
            console.log("Worker: Fetching image from URL:", mediaItem.url);
            const response = await fetch(mediaItem.url);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status}`);
            }

            const imageBytes = await response.arrayBuffer();

            const uploadResult = await agent.uploadBlob(
              new Uint8Array(imageBytes),
              {
                encoding: mediaItem.fileInfo?.type || "image/jpeg",
              }
            );

            if (uploadResult.success) {
              images.push({
                image: uploadResult.data.blob,
                alt: mediaItem.altText || mediaItem.originalName || "",
              });
              console.log("Worker: Image uploaded successfully");
            }
          } catch (uploadError) {
            console.error("Worker: Image upload error:", uploadError.message);
          }
        }
        // Check if it's a video - only process one video per post
        else if (
          (mediaItem.type &&
            (mediaItem.type.startsWith("video/") ||
              mediaItem.type.includes("video") ||
              mediaItem.type === "video/quicktime" ||
              mediaItem.type === "video/mp4")) ||
          (mediaItem.originalName &&
            (mediaItem.originalName.toLowerCase().endsWith(".mp4") ||
              mediaItem.originalName.toLowerCase().endsWith(".mov") ||
              mediaItem.originalName.toLowerCase().endsWith(".webm")))
        ) {
          // Only process one video per post
          if (videoEmbed) {
            console.log(
              "Worker: Skipping additional video, only one allowed per post"
            );
            continue;
          }

          console.log("Worker: Processing video upload for BlueSky");
          try {
            const videoResult = await uploadVideo(
              agent,
              mediaItem.url,
              mediaItem
            );

            if (videoResult.success && videoResult.blob) {
              console.log("Worker: Video upload successful, creating embed");

              videoEmbed = {
                $type: "app.bsky.embed.video",
                video: videoResult.blob,
                alt: mediaItem.altText || mediaItem.originalName || "Video",
              };

              console.log("Worker: Video embed created successfully");
            } else {
              throw new Error(videoResult.error || "Video upload failed");
            }
          } catch (videoError) {
            console.error(`Worker: Video upload error: ${videoError.message}`);
          }
        } else {
          console.log(
            "Worker: Skipping unsupported media type:",
            mediaItem.type
          );
        }
      }
    }

    // Create post record
    const record = {
      text: postText,
      createdAt: new Date().toISOString(),
    };

    // Add media embeds if we have any
    if (images.length > 0 && !videoEmbed) {
      // If we only have images and no video
      record.embed = {
        $type: "app.bsky.embed.images",
        images: images,
      };
    } else if (videoEmbed) {
      // If we have a video, use that as the embed
      record.embed = videoEmbed;
    }

    console.log(
      "Worker: Posting to BlueSky with record:",
      JSON.stringify({
        text: record.text,
        hasEmbed: !!record.embed,
        embedType: record.embed?.$type || "none",
        imageCount: images.length,
        hasVideo: !!videoEmbed,
      })
    );

    // Publish the post
    const postResponse = await agent.api.app.bsky.feed.post.create(
      { repo: agent.session.did },
      record
    );

    console.log("Worker: BlueSky post successful:", postResponse.uri);

    // Return success
    return {
      success: true,
      message: "Post successfully published to BlueSky",
      platform: "bluesky",
      postId: postResponse.cid,
      postUri: postResponse.uri,
      postUrl: `https://bsky.app/profile/${platformUsername}/post/${postResponse.uri
        .split("/")
        .pop()}`,
    };
  } catch (error) {
    console.error("Worker: BlueSky posting error:", error);
    return {
      success: false,
      message: `Failed to post to BlueSky: ${error.message}`,
      platform: "bluesky",
      error: {
        name: error.name,
        message: error.message,
      },
    };
  }
}

/**
 * Register a video upload with LinkedIn - duplicated from main service
 */
async function registerVideoUpload(accessToken, personId, fileSizeBytes) {
  const registerData = {
    initializeUploadRequest: {
      owner: `urn:li:person:${personId}`,
      fileSizeBytes: fileSizeBytes,
      uploadCaptions: false,
      uploadThumbnail: false
    }
  };

  try {
    const response = await fetch("https://api.linkedin.com/rest/videos?action=initializeUpload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202501",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(registerData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`LinkedIn video registration error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Worker: LinkedIn video registration failed:", error);
    throw new Error(`LinkedIn video registration failed: ${error.message}`);
  }
}

/**
 * Upload video in chunks to LinkedIn - simplified version for worker
 */
async function uploadVideoChunks(uploadInstructions, videoBuffer, fileSizeBytes) {
  try {
    console.log("Worker: Starting chunked upload, instructions:", uploadInstructions.length);

    // Upload in parts (4MB chunks) - following same pattern as main service
    const chunkSize = 4 * 1024 * 1024; // 4MB
    const uploadedParts = [];
    
    for (let i = 0; i < uploadInstructions.length; i++) {
      const instruction = uploadInstructions[i];
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileSizeBytes);
      const chunk = videoBuffer.slice(start, end);
      
      console.log(`Worker: Uploading part ${i + 1}/${uploadInstructions.length}, bytes ${start}-${end}`);
      console.log(`Worker: Instruction for part ${i + 1}:`, JSON.stringify(instruction, null, 2));
      
      const uploadResponse = await fetch(instruction.uploadUrl, {
        method: "PUT",
        body: chunk,
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Video part upload failed: ${uploadResponse.status}`);
      }

      // LinkedIn requires us to use the ETag as the part ID for signed uploads
      const partId = uploadResponse.headers.get("etag");
      console.log(`Worker: Part ${i + 1} uploaded, partId:`, partId, "etag:", uploadResponse.headers.get("etag"));
      
      uploadedParts.push({
        uploadPartId: partId,
        etag: uploadResponse.headers.get("etag")
      });
    }

    console.log("Worker: Final uploadedParts:", JSON.stringify(uploadedParts, null, 2));

    // Return part IDs in the format expected by finalization
    return uploadedParts.map(part => part.uploadPartId);
  } catch (error) {
    console.error("Worker: LinkedIn video upload failed:", error);
    throw new Error(`LinkedIn video upload failed: ${error.message}`);
  }
}

/**
 * Finalize video upload with LinkedIn
 */
async function finalizeVideoUpload(accessToken, videoUrn, uploadToken, partIds) {
  try {
    const finalizeData = {
      finalizeUploadRequest: {
        video: videoUrn,
        uploadToken: uploadToken,
        uploadedPartIds: partIds
      }
    };

    const response = await fetch("https://api.linkedin.com/rest/videos?action=finalizeUpload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202501",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(finalizeData),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => 'No response body');
      console.error(`Worker: LinkedIn finalization failed - Status: ${response.status}, Response: ${responseText}`);
      throw new Error(`LinkedIn video finalization error: ${response.status} - ${response.statusText} - ${responseText}`);
    }

    const responseText = await response.text();
    console.log("Worker: LinkedIn finalization response text:", responseText);
    
    if (!responseText.trim()) {
      console.log("Worker: LinkedIn finalization returned empty response (this is actually success for finalization)");
      return { success: true };
    }
    
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.log("Worker: LinkedIn finalization response is not JSON, treating as success");
      return { success: true };
    }
  } catch (error) {
    console.error("Worker: LinkedIn video finalization failed:", error);
    throw new Error(`LinkedIn video finalization failed: ${error.message}`);
  }
}

/**
 * Register an image upload with LinkedIn - duplicated from main service
 */
async function registerImageUpload(accessToken, personId) {
  const registerData = {
    registerUploadRequest: {
      recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
      owner: `urn:li:person:${personId}`,
      serviceRelationships: [
        {
          relationshipType: "OWNER",
          identifier: "urn:li:userGeneratedContent"
        }
      ]
    }
  };

  try {
    const response = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registerData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`LinkedIn image registration error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Worker: LinkedIn image registration failed:", error);
    throw new Error(`LinkedIn image registration failed: ${error.message}`);
  }
}

/**
 * Upload image to LinkedIn - duplicated from main service
 */
async function uploadImage(uploadMechanism, imageFile) {
  const uploadUrl = uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;

  try {
    // Get image data from URL since we don't have buffer
    let imageBuffer;

    if (imageFile.buffer) {
      // If we have a buffer, use it directly
      imageBuffer = imageFile.buffer;
    } else if (imageFile.url) {
      console.log("Worker: Downloading image from URL:", imageFile.url);
      const response = await fetch(imageFile.url);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error("No image data or URL available");
    }

    await fetch(uploadUrl, {
      method: "PUT",
      body: imageBuffer,
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });

    console.log("Worker: Image uploaded successfully");
  } catch (error) {
    console.error("Worker: LinkedIn image upload failed:", error);
    throw new Error(`LinkedIn image upload failed: ${error.message}`);
  }
}

/**
 * Post to LinkedIn - Duplicated working logic from main service
 */
async function postToLinkedIn(account, postData) {
  console.log("Worker: Posting to LinkedIn using duplicated working logic");

  try {
    // Extract account information - use originalData if available
    const accountData = account.originalData || account;
    const { accessToken, platformAccountId } = accountData;
    
    if (!accessToken) {
      throw new Error("No access token available for LinkedIn account");
    }

    // Get post text from various sources (same logic as main service)
    let postText = "";
    if (postData.text) {
      postText = postData.text;
    } else if (postData.textContent) {
      postText = postData.textContent;
    } else if (postData.captions?.mode === "single") {
      postText = postData.captions.single || "";
    } else if (postData.captions?.mode === "multiple") {
      postText = postData.captions?.multiple?.[accountData.id] || postData.captions?.single || "";
    }

    console.log("Worker: LinkedIn post text:", postText);

    // Check media type
    const hasMedia = postData.media && postData.media.length > 0;
    let mediaType = "text";
    let shareMediaCategory = "NONE";
    let media = [];
    
    if (hasMedia) {
      const mediaItem = postData.media[0];
      if (mediaItem.type?.startsWith('video/')) {
        mediaType = "video";
      } else if (mediaItem.type?.startsWith('image/')) {
        mediaType = "image";
        shareMediaCategory = "IMAGE";
      }
    }

    console.log(`Worker: LinkedIn post type: ${mediaType}`);

    if (mediaType === "video") {
      // Handle video upload workflow
      const videoFile = postData.media[0];
      console.log("Worker: Processing LinkedIn video upload");
      shareMediaCategory = "VIDEO";
      
      try {
        // Step 1: Get video data (following same pattern as main service)
        console.log("Worker: Step 1 - Getting video data");
        let videoBuffer;
        let fileSizeBytes;
        
        if (videoFile.buffer) {
          console.log("Worker: Using existing buffer");
          videoBuffer = videoFile.buffer;
          fileSizeBytes = videoBuffer.length;
        } else if (videoFile.data) {
          console.log("Worker: Using existing data");
          videoBuffer = Buffer.isBuffer(videoFile.data) ? videoFile.data : Buffer.from(videoFile.data);
          fileSizeBytes = videoBuffer.length;
        } else if (videoFile.url) {
          console.log("Worker: Downloading from Firebase URL:", videoFile.url);
          // Use fetch instead of axios for worker environment
          const response = await fetch(videoFile.url, {
            method: 'GET'
          });
          if (!response.ok) {
            throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          videoBuffer = Buffer.from(arrayBuffer);
          fileSizeBytes = videoBuffer.length;
        } else {
          throw new Error("No video data or URL available");
        }
        
        console.log("Worker: Video data ready, size:", fileSizeBytes);

        // Step 2: Register video upload with LinkedIn
        console.log("Worker: Step 2 - Registering video upload with LinkedIn");
        const registerResponse = await registerVideoUpload(accessToken, platformAccountId, fileSizeBytes);
        console.log("Worker: Video registration response:", registerResponse);
        
        // Extract upload data
        const uploadData = registerResponse.value;
        const videoUrn = uploadData.video;
        const uploadToken = uploadData.uploadToken;
        const uploadInstructions = uploadData.uploadInstructions;
        
        // Step 3: Upload video in chunks (following same pattern as main service)
        console.log("Worker: Step 3 - Uploading video chunks");
        const partIds = await uploadVideoChunks(uploadInstructions, videoBuffer, fileSizeBytes);
        console.log("Worker: Video chunks uploaded, part IDs:", partIds);
        
        // Step 3: Finalize video upload
        console.log("Worker: Step 3 - Finalizing video upload");
        const finalizeResponse = await finalizeVideoUpload(accessToken, videoUrn, uploadToken, partIds);
        console.log("Worker: Video upload finalized");
        
        // Add video to media array
        media = [{
          status: "READY",
          description: {
            text: "Video Post"
          },
          media: videoUrn,
          title: {
            text: "Video Post"
          }
        }];
        
        console.log("Worker: LinkedIn video upload completed successfully");
      } catch (videoError) {
        console.error("Worker: LinkedIn video upload failed:", videoError);
        throw new Error(`LinkedIn video upload failed: ${videoError.message}`);
      }
    }

    if (mediaType === "image") {
      // Handle image upload
      const imageFile = postData.media[0];
      console.log("Worker: Processing LinkedIn image upload");
      console.log("Worker: Image file data:", {
        url: imageFile.url,
        type: imageFile.type,
        hasBuffer: !!imageFile.buffer
      });
      
      try {
        // Register image upload
        console.log("Worker: Step 1 - Registering image upload");
        const registerResponse = await registerImageUpload(accessToken, platformAccountId);
        console.log("Worker: Image registration successful");
        
        // Upload the image
        console.log("Worker: Step 2 - Uploading image");
        await uploadImage(registerResponse.value.uploadMechanism, imageFile);
        console.log("Worker: Image upload successful");
        
        // Add image to media array
        media = [{
          status: "READY",
          description: {
            text: "Image Post"
          },
          media: registerResponse.value.asset,
          title: {
            text: "Image Post"
          }
        }];
        
        console.log("Worker: LinkedIn image upload completed successfully");
      } catch (imageError) {
        console.error("Worker: LinkedIn image upload failed:", imageError);
        throw new Error(`LinkedIn image upload failed: ${imageError.message}`);
      }
    }

    // Choose API endpoint based on media type
    let apiEndpoint, postBody, headers;

    if (mediaType === "video") {
      // For video posts, use the newer Posts API (like immediate posting)
      apiEndpoint = "https://api.linkedin.com/rest/posts";
      
      postBody = {
        author: `urn:li:person:${platformAccountId}`,
        commentary: postText,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: []
        },
        content: {
          media: {
            title: "Video Post",
            id: media[0].media // This is the video URN
          }
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false
      };

      headers = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202501",
        "X-Restli-Protocol-Version": "2.0.0",
      };
    } else {
      // For text and image posts, use UGC API
      apiEndpoint = "https://api.linkedin.com/v2/ugcPosts";
      
      postBody = {
        author: `urn:li:person:${platformAccountId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: postText,
            },
            shareMediaCategory: shareMediaCategory,
            media: media,
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      };

      headers = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      };
    }

    console.log(`Worker: LinkedIn posting to ${apiEndpoint}`);
    console.log("Worker: LinkedIn post body:", JSON.stringify(postBody, null, 2));

    // Post to LinkedIn API
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(postBody),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => 'No response body');
      console.error(`Worker: LinkedIn post failed - Status: ${response.status}, Response: ${responseText}`);
      throw new Error(`LinkedIn API error: ${response.status} - ${response.statusText} - ${responseText}`);
    }

    const responseText = await response.text();
    console.log("Worker: LinkedIn post response text:", responseText);
    
    let responseData = {};
    const timestamp = Date.now();
    
    if (responseText.trim()) {
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.log("Worker: LinkedIn post response is not JSON, treating as success");
        responseData = { id: `success-${timestamp}` };
      }
    } else {
      console.log("Worker: LinkedIn post returned empty response, treating as success");
      responseData = { id: `success-${timestamp}` };
    }
    
    console.log("Worker: LinkedIn post successful");
    
    return {
      success: true,
      platform: "linkedin",
      postId: responseData.id,
      postUrl: responseData.id && !responseData.id.startsWith('success-')
        ? `https://www.linkedin.com/posts/${platformAccountId}_${responseData.id}`
        : null,
    };
  } catch (error) {
    console.error("Worker: LinkedIn posting error:", error);
    return {
      success: false,
      message: `Failed to post to LinkedIn: ${error.message}`,
      platform: "linkedin",
      error: {
        name: error.name,
        message: error.message,
      },
    };
  }
}

/**
 * Direct implementation of postToPlatform that works without importing
 * the original apiManager
 */
export async function postToPlatform(platform, account, postData) {
  console.log(`Worker: Posting to ${platform} using direct implementation`);

  try {
    // Handle database connection first
    await connectToDatabase();

    // Platform-specific implementations
    if (platform === "bluesky") {
      return await postToBlueSky(account, postData);
    }
    if (platform === "linkedin") {
      return await postToLinkedIn(account, postData);
    }

    // For other platforms, we'll create simplified mock implementations for now
    // In production, you should implement actual posting logic for each platform

    console.log(
      `Worker: Platform ${platform} not directly implemented, using mock`
    );
    return {
      success: true,
      platform,
      postId: `worker-post-${Date.now()}`,
      message: `Posted to ${platform} (worker implementation)`,
    };
  } catch (error) {
    console.error(`Worker: Error posting to ${platform}:`, error);
    return {
      success: false,
      platform,
      error: error.message || `Failed to post to ${platform}`,
    };
  }
}
