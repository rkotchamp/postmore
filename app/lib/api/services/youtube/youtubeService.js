/**
 * YouTube API Service
 * Handles all YouTube-specific API operations for YouTube Shorts
 */

import axios from "axios";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import os from "os";
import stream from "stream";
import { promisify } from "util";
import { connectToDatabase } from "../../../db/mongodb.js";

// Constants for YouTube API
const YOUTUBE_API_VERSION = "v3";
const YOUTUBE_UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload";

// Error codes for better error handling
const YOUTUBE_ERROR_CODES = {
  QUOTA_EXCEEDED: "quotaExceeded",
  INVALID_TOKEN: "invalidToken",
  UPLOAD_FAILED: "uploadFailed",
  VIDEO_PROCESSING: "videoProcessing",
  INVALID_FORMAT: "invalidFormat",
};

// Retry configuration
const RETRY_CONFIG = {
  numOfAttempts: 3,
  startingDelay: 1000,
  timeMultiple: 2,
  maxDelay: 10000,
};

/**
 * Post content to YouTube Shorts
 *
 * @param {object} account - YouTube account data (token, refresh token, channel, etc.)
 * @param {object} postData - Content data (title, description, media, etc.)
 * @returns {Promise<object>} - Result of the YouTube API call
 */
async function post(account, postData) {
  console.log("🔍 YOUTUBE: Service called");
  console.log("🔍 YOUTUBE: account:", JSON.stringify(account, null, 2));
  console.log("🔍 YOUTUBE: postData:", JSON.stringify(postData, null, 2));
  
  try {
    // Ensure we have a fresh token
    const accountData = await ensureFreshToken(account);

    // Validate required fields for YouTube
    const validation = validateYouTubeData(postData);
    if (!validation.valid) {
      throw new Error(validation.reason || "Invalid YouTube post data");
    }

    // Prepare post text (same logic as BlueSky)
    let postText = "";
    console.log("🔍 YOUTUBE: Processing captions, contentType:", postData.contentType);
    
    if (postData.contentType === "text") {
      postText = postData.text || "";
      console.log("🔍 YOUTUBE: Text post, postText:", postText);
    } else if (postData.contentType === "media") {
      console.log("🔍 YOUTUBE: Media post, captions:", JSON.stringify(postData.captions, null, 2));
      if (postData.captions?.mode === "single") {
        postText = postData.captions.single || "";
        console.log("🔍 YOUTUBE: Single caption mode, postText:", postText);
      } else if (postData.captions?.mode === "multiple") {
        postText =
          postData.captions?.multiple?.[account.id] ||
          postData.captions?.single ||
          "";
        console.log("🔍 YOUTUBE: Multiple caption mode, account.id:", account.id);
        console.log("🔍 YOUTUBE: Multiple caption mode, postText:", postText);
      }
    }
    
    // Use postText as the caption for YouTube
    const caption = postText;
    console.log("🔍 YOUTUBE: Final caption:", caption);

    // Process media for upload
    // For YouTube Shorts, we need the first video file
    const videoFile = postData.media[0];

    // Perform detailed validation for Shorts requirements if we have a file
    if (validation.needsDetailedValidation && videoFile.file) {
      try {
        const shortsValidation = await validateYouTubeShortsVideo(videoFile);

        if (!shortsValidation.valid) {
          throw new Error(
            `Video doesn't meet YouTube Shorts requirements: ${shortsValidation.reasons.join(
              ", "
            )}`
          );
        }

        // Add metadata to videoFile for later use
        videoFile.metadata = shortsValidation.metadata;
      } catch (validationError) {
        console.warn("Video validation warning:", validationError.message);
        // Continue with upload even if validation couldn't be completed fully
      }
    }

    // Check if this is a scheduled post
    const isScheduled =
      postData.scheduledTime && new Date(postData.scheduledTime) > new Date();
    const scheduledTime = isScheduled ? new Date(postData.scheduledTime) : null;

    // Upload the video file to YouTube with scheduling information if needed
    const uploadResult = await uploadVideoToYouTube(
      accountData.accessToken,
      videoFile,
      caption, // Description
      postData.title || (caption ? caption.slice(0, 100) : "YouTube Short"), // Title (required, use caption if no title)
      scheduledTime // Pass scheduled time if this is a scheduled post
    );

    // Return structured response with scheduling information if applicable
    return {
      success: true,
      videoId: uploadResult.id,
      url: `https://youtube.com/shorts/${uploadResult.id}`,
      status: uploadResult.status,
      isScheduled: isScheduled,
      scheduledTime: scheduledTime ? scheduledTime.toISOString() : null,
      publishedAt: !isScheduled ? new Date().toISOString() : null,
      nativeScheduling: isScheduled, // Flag for native YouTube scheduling
    };
  } catch (error) {
    console.error("Error in YouTube Shorts post service:", error);
    return {
      success: false,
      error: error.message || "Unknown error in YouTube Shorts service",
      details: error.stack,
      errorCode: error.errorType || "unknown_error",
    };
  }
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

/**
 * Validate the data required for YouTube posting
 *
 * @param {object} postData - The data to validate
 * @returns {object} - Validation result with valid flag and reason
 */
function validateYouTubeData(postData) {
  // YouTube requires at least one video file
  if (!postData.media || postData.media.length === 0) {
    return {
      valid: false,
      reason: "YouTube Shorts posts require at least one video file",
    };
  }

  // Check if the first file is a video
  const firstFile = postData.media[0];
  const isVideo = firstFile.type && firstFile.type.startsWith("video/");
  const hasVideoUrl =
    firstFile.url &&
    (firstFile.url.endsWith(".mp4") ||
      firstFile.url.endsWith(".mov") ||
      firstFile.url.endsWith(".avi"));

  if (!isVideo && !hasVideoUrl) {
    return {
      valid: false,
      reason:
        "The file provided is not a valid video format for YouTube Shorts",
    };
  }

  // Validate scheduled time if provided
  if (postData.scheduledTime) {
    const scheduledDate = new Date(postData.scheduledTime);
    const now = new Date();

    if (isNaN(scheduledDate.getTime())) {
      return {
        valid: false,
        reason: "Invalid scheduled time format",
      };
    }

    if (scheduledDate <= now) {
      return {
        valid: false,
        reason: "Scheduled time must be in the future",
      };
    }

    // YouTube has a limit of 8 weeks in the future for scheduling
    const maxScheduleDate = new Date();
    maxScheduleDate.setDate(maxScheduleDate.getDate() + 8 * 7); // 8 weeks

    if (scheduledDate > maxScheduleDate) {
      return {
        valid: false,
        reason: "YouTube only allows scheduling up to 8 weeks in advance",
      };
    }
  }

  // Basic validation passed, but flag for detailed validation if we have a file object
  return {
    valid: true,
    needsDetailedValidation: firstFile.file != null,
  };
}

/**
 * Validate video for YouTube Shorts requirements
 * @param {Object} videoFile - The video file object
 * @returns {Promise<Object>} - Validation result {valid, reasons, metadata}
 */
async function validateYouTubeShortsVideo(videoFile) {
  const reasons = [];

  // Function to check video dimensions and duration
  const getVideoDimensions = (file) => {
    return new Promise((resolve, reject) => {
      // For server-side execution where document is not available
      if (typeof document === "undefined" || typeof URL === "undefined") {
        resolve({
          duration: 30, // Assume valid duration
          width: 1080,
          height: 1920,
          aspectRatio: 9 / 16,
        });
        return;
      }

      try {
        const video = document.createElement("video");
        video.preload = "metadata";

        video.onloadedmetadata = () => {
          const result = {
            duration: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
            aspectRatio: video.videoWidth / video.videoHeight,
          };
          URL.revokeObjectURL(video.src);
          resolve(result);
        };

        video.onerror = (e) => {
          URL.revokeObjectURL(video.src);
          reject(
            new Error(
              `Error loading video metadata: ${e.message || "Unknown error"}`
            )
          );
        };

        // Try to create object URL from file
        const fileObj = videoFile.file || videoFile;
        video.src = URL.createObjectURL(fileObj);
      } catch (error) {
        reject(error);
      }
    });
  };

  try {
    // Check file size (100MB limit for YouTube shorts)
    const fileObj = videoFile.file || videoFile;
    const fileSize = fileObj.size || 0;
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

    if (fileSize > MAX_FILE_SIZE) {
      reasons.push(
        `File size exceeds 100MB limit (${Math.round(
          fileSize / 1024 / 1024
        )}MB)`
      );
    }

    // Try to check video metadata if possible
    try {
      const metadata = await getVideoDimensions(fileObj);

      // Check duration (60s limit for Shorts)
      const MAX_DURATION = 60;
      if (metadata.duration > MAX_DURATION) {
        reasons.push(
          `Duration exceeds 60 seconds (${Math.round(metadata.duration)}s)`
        );
      }

      // Check aspect ratio (ideal is 9:16 for Shorts)
      const IDEAL_ASPECT_RATIO = 9 / 16;
      const ASPECT_RATIO_TOLERANCE = 0.2;

      const actualRatio = metadata.width / metadata.height;
      if (Math.abs(actualRatio - IDEAL_ASPECT_RATIO) > ASPECT_RATIO_TOLERANCE) {
        reasons.push(
          `Aspect ratio is not optimal for Shorts (9:16 recommended, got ${metadata.width}x${metadata.height})`
        );
      }

      // Return validation result with metadata
      return {
        valid: reasons.length === 0,
        reasons,
        metadata,
      };
    } catch (metadataError) {
      console.warn("Could not check video metadata:", metadataError);
      // Continue with limited validation if metadata check fails
      return {
        valid: true, // Assume valid if we can't check
        reasons: ["Could not fully validate video - proceeding with upload"],
        metadata: null,
      };
    }
  } catch (error) {
    console.error("Error validating video:", error);
    return {
      valid: false,
      reasons: [`Could not validate video: ${error.message}`],
      error,
    };
  }
}

/**
 * Extract account data from the account object
 * Handles both direct format and nested originalData format
 */
function extractAccountData(account) {
  // If account has originalData, use that (coming from API manager)
  if (account.originalData) {
    return account.originalData;
  }

  // Otherwise, assume it's already in the correct format

  return account;
}

/**
 * Ensure we have a fresh, valid access token for the YouTube account
 */
async function ensureFreshToken(account) {
  // Extract the actual account data
  const accountData = extractAccountData(account);

  if (!accountData.accessToken) {
    throw new Error("No access token available for this YouTube account");
  }

  // Check if token is expired and refresh if needed
  const now = new Date();
  const tokenExpiry = new Date(accountData.tokenExpiry);

  // If token expires within the next 5 minutes, refresh it
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  if (tokenExpiry.getTime() - now.getTime() < bufferTime) {
    try {
      const refreshedToken = await refreshYouTubeToken(accountData);
      if (refreshedToken) {
        // Update the account data with the new token
        accountData.accessToken = refreshedToken.access_token;
        accountData.tokenExpiry = new Date(
          Date.now() + refreshedToken.expires_in * 1000
        );

        // Update the database with the new token
        await updateAccountTokenInDatabase(accountData._id, {
          accessToken: refreshedToken.access_token,
          tokenExpiry: accountData.tokenExpiry,
        });
      }
    } catch (error) {
      console.error("Failed to refresh YouTube token:", error);

      // If refresh fails but we still have an existing token, try to use it
      if (accountData.accessToken && error.message.includes("reconnected")) {
        // Don't throw error, let the upload attempt proceed with existing token
      } else {
        throw new Error(`Token refresh failed: ${error.message}`);
      }
    }
  }

  return accountData;
}

/**
 * Refresh YouTube access token using refresh token
 */
async function refreshYouTubeToken(accountData) {
  try {
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );

    // Set credentials using refresh token
    oauth2Client.setCredentials({
      refresh_token: accountData.refreshToken,
    });

    // Get a new access token
    const { token, res } = await oauth2Client.getAccessToken();

    if (!token) {
      throw new Error("Failed to refresh token");
    }

    return {
      access_token: token,
      expires_in: res.data.expires_in || 3600, // Default to 1 hour
    };
  } catch (error) {
    console.error("Error refreshing YouTube token:", error);

    // Handle specific error cases
    if (error.message.includes("invalid_grant")) {
      console.error(
        "YouTube refresh token is invalid or expired. User needs to reconnect their account."
      );

      // Update account status to show it needs reconnection
      try {
        const db = await connectToDatabase();
        await db.collection("socialaccounts").updateOne(
          { _id: accountData._id },
          {
            $set: {
              status: "error",
              errorMessage:
                "Refresh token expired. Please reconnect your YouTube account.",
              updatedAt: new Date(),
            },
          }
        );
      } catch (dbError) {
        console.error("Error updating account status:", dbError);
      }

      throw new Error(
        "YouTube account needs to be reconnected - refresh token expired"
      );
    }

    throw new Error(`Failed to refresh YouTube token: ${error.message}`);
  }
}

/**
 * Main YouTube upload function with retry mechanism
 */
async function uploadVideoToYouTube(
  accessToken,
  videoFile,
  description,
  title,
  scheduledTime = null
) {
  const maxAttempts = RETRY_CONFIG.numOfAttempts;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Set up OAuth2 client with fresh token
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.YOUTUBE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      // Create YouTube API client
      const youtube = google.youtube({
        version: YOUTUBE_API_VERSION,
        auth: oauth2Client,
      });

      // Prepare status object based on whether this is scheduled or immediate
      const statusObject = scheduledTime
        ? {
            privacyStatus: "private",
            publishAt: scheduledTime.toISOString(), // YouTube will automatically publish at this time
            selfDeclaredMadeForKids: false,
          }
        : {
            privacyStatus: "public", // Immediate publish
            selfDeclaredMadeForKids: false,
          };

      // Prepare video metadata for Shorts
      const videoMetadata = {
        snippet: {
          title: title,
          description: description,
          tags: ["PostMore", "YouTube Shorts"],
          categoryId: "22", // People & Blogs category
        },
        status: statusObject,
      };

      let tempFilePath = null;
      let fileStream = null;

      try {
        // Enhanced file handling logic
        if (videoFile.url) {
          // Case 1: If we have a URL to a video (most common for Firebase storage)

          const response = await axios({
            method: "get",
            url: videoFile.url,
            responseType: "stream",
            timeout: 60000, // 1 minute timeout
          });

          // Create a temporary file
          tempFilePath = path.join(
            os.tmpdir(),
            `youtube-upload-${Date.now()}.mp4`
          );
          const writer = fs.createWriteStream(tempFilePath);

          // Pipe the download stream to the file
          response.data.pipe(writer);

          // Wait for the download to complete
          await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
            response.data.on("error", reject);
          });

          fileStream = fs.createReadStream(tempFilePath);
        }
        // Case 2: If we have file data or a Buffer
        else if (videoFile.file) {
          // Handle different file data structures
          let fileData = null;

          if (Buffer.isBuffer(videoFile.file)) {
            fileData = videoFile.file;
          } else if (typeof videoFile.file === "string") {
            // If it's a base64 string or file path
            if (videoFile.file.startsWith("data:")) {
              // Base64 data URL
              const base64Data = videoFile.file.split(",")[1];
              fileData = Buffer.from(base64Data, "base64");
            } else if (fs.existsSync(videoFile.file)) {
              // File path
              fileData = fs.readFileSync(videoFile.file);
            } else {
              throw new Error(`File path does not exist: ${videoFile.file}`);
            }
          } else if (
            videoFile.file.path &&
            fs.existsSync(videoFile.file.path)
          ) {
            // File object with path property
            fileData = fs.readFileSync(videoFile.file.path);
          } else if (videoFile.file.data) {
            // File object with data property
            fileData = videoFile.file.data;
          } else {
            console.error("Unsupported file structure:", videoFile.file);
            throw new Error("Unsupported video file format or structure");
          }

          if (!fileData) {
            throw new Error("Could not extract video file data");
          }

          // Create a temporary file from the file data
          tempFilePath = path.join(
            os.tmpdir(),
            `youtube-upload-${Date.now()}.mp4`
          );

          fs.writeFileSync(tempFilePath, fileData);
          fileStream = fs.createReadStream(tempFilePath);
        } else {
          throw new Error("No valid video file or URL provided");
        }

        // Upload the video

        const uploadResponse = await youtube.videos.insert({
          part: "snippet,status",
          requestBody: videoMetadata,
          media: {
            body: fileStream,
          },
        });

        const videoId = uploadResponse.data.id;

        // Clean up the temporary file if we created one
        if (tempFilePath) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (cleanupError) {
            console.warn("Failed to clean up temporary file:", cleanupError);
          }
        }

        return {
          id: videoId,
          status: scheduledTime ? "scheduled" : "uploaded",
          url: `https://youtube.com/shorts/${videoId}`,
          scheduledTime: scheduledTime ? scheduledTime.toISOString() : null,
        };
      } catch (fileError) {
        // Clean up temp file on error
        if (tempFilePath) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (cleanupError) {
            console.warn(
              "Failed to clean up temporary file after error:",
              cleanupError
            );
          }
        }
        throw fileError;
      }
    } catch (error) {
      lastError = error;
      console.error(
        `YouTube upload error (attempt ${attempt}/${maxAttempts}):`,
        error
      );

      // Enhanced error categorization
      let shouldRetry = false;
      let errorCode = "unknown_error";

      // Handle HTTP errors from Google API
      if (error.response && error.response.status) {
        const status = error.response.status;

        if (status >= 500) {
          // Server errors are retryable

          shouldRetry = true;
          errorCode = YOUTUBE_ERROR_CODES.UPLOAD_FAILED;
        } else if (status === 403) {
          // Check if it's account suspension vs quota
          if (error.message && error.message.includes("suspended")) {
            shouldRetry = false;
            errorCode = "account_suspended";

            // Update account status in database
            try {
              const db = await connectToDatabase();
              await db.collection("socialaccounts").updateOne(
                { _id: accountData._id || accountData.id },
                {
                  $set: {
                    status: "suspended",
                    errorMessage:
                      "YouTube account suspended - check YouTube Studio",
                    updatedAt: new Date(),
                  },
                }
              );
            } catch (dbError) {
              console.error(
                "Failed to update suspended account status:",
                dbError
              );
            }
          } else {
            // Quota or permission errors are not retryable

            shouldRetry = false;
            errorCode = YOUTUBE_ERROR_CODES.QUOTA_EXCEEDED;
          }
        } else if (status === 401) {
          // Auth errors might be retryable after token refresh

          shouldRetry = true;
          errorCode = YOUTUBE_ERROR_CODES.INVALID_TOKEN;
        }
      }
      // Handle file-related errors
      else if (error.message && error.message.includes("ENOENT")) {
        shouldRetry = false;
        errorCode = "file_not_found";
      }
      // Handle network/timeout errors
      else if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        shouldRetry = true;
        errorCode = "network_timeout";
      }
      // Handle generic errors that might be retryable
      else if (attempt < maxAttempts) {
        shouldRetry = true;
      }

      // Add error code to error object for better debugging
      error.errorCode = errorCode;

      // If this is the last attempt or we shouldn't retry, rethrow
      if (attempt >= maxAttempts || !shouldRetry) {
        throw error;
      }

      // Calculate backoff time
      const delay = Math.min(
        RETRY_CONFIG.startingDelay *
          Math.pow(RETRY_CONFIG.timeMultiple, attempt - 1),
        RETRY_CONFIG.maxDelay
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // If we get here, all attempts failed
  throw lastError;
}

/**
 * Update account token in database
 */
async function updateAccountTokenInDatabase(accountId, tokenData) {
  try {
    const db = await connectToDatabase();

    const result = await db.collection("socialaccounts").updateOne(
      { _id: accountId },
      {
        $set: {
          accessToken: tokenData.accessToken,
          tokenExpiry: tokenData.tokenExpiry,
          updatedAt: new Date(),
        },
      }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error("Error updating account token in database:", error);
    return false;
  }
}

// Export the YouTube service
export default {
  post,
  // Export for testing
  extractAccountData,
  validateYouTubeShortsVideo,
  refreshYouTubeToken,
};
