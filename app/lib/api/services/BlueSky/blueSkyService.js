import { BskyAgent } from "@atproto/api";
import SocialAccount from "@/app/models/SocialAccount"; // Add import for SocialAccount model

// Import utility files
import { uploadVideo, ALLOWED_VIDEO_FORMATS } from "./videoPostBlueSky";
import { editPost } from "./editBlueSkyPost";
import { deletePost, deletePosts } from "./deleteBlueSkyPost";

// Constants
const BSKY_SERVICE_URL = "https://bsky.social";
const MAX_IMAGE_SIZE_BYTES = 1000000; // 1MB
const MAX_IMAGES_PER_POST = 4;
const MAX_VIDEO_DURATION_MINUTES = 3; // Bluesky supports 3 minute videos

// Token refresh locks to prevent concurrent refresh requests for the same account
const tokenRefreshLocks = new Map();

/**
 * Refreshes Bluesky access token using refresh token and updates database
 * @param {BskyAgent} agent - Bluesky agent instance
 * @param {object} accountData - Account data with tokens
 * @returns {Promise<object>} Updated tokens or null if refresh failed
 */
const refreshTokenAndUpdate = async (agent, accountData) => {
  // Check if a refresh is already in progress for this account
  const accountId = accountData.platformAccountId;
  if (tokenRefreshLocks.get(accountId)) {
    console.log(
      `BlueSky: Refresh already in progress for ${accountData.platformUsername}, waiting...`
    );
    // Wait for the existing refresh to complete
    try {
      const result = await tokenRefreshLocks.get(accountId);
      console.log(
        `BlueSky: Using result from existing refresh for ${accountData.platformUsername}`
      );
      return result;
    } catch (error) {
      console.error(
        `BlueSky: Existing refresh failed for ${accountData.platformUsername}`,
        error
      );
      // Continue with a new refresh attempt
    }
  }

  // Create a promise for this refresh attempt
  let resolveRefreshLock;
  let rejectRefreshLock;
  const refreshPromise = new Promise((resolve, reject) => {
    resolveRefreshLock = resolve;
    rejectRefreshLock = reject;
  });

  // Set the lock
  tokenRefreshLocks.set(accountId, refreshPromise);

  try {
    console.log(
      `BlueSky: Attempting to refresh token for ${accountData.platformUsername}`
    );

    // Verify we have the required data for refresh
    if (!accountData.refreshToken || !accountData.platformUsername) {
      console.error("BlueSky: Missing refresh token or username", {
        hasRefreshToken: !!accountData.refreshToken,
        hasUsername: !!accountData.platformUsername,
      });
      throw new Error("Missing credentials for token refresh");
    }

    // Login with the username and refresh token
    console.log("BlueSky: Calling login with refresh token");
    const refreshResult = await agent.login({
      identifier: accountData.platformUsername,
      refreshJwt: accountData.refreshToken,
    });

    console.log(
      "BlueSky: Refresh result:",
      refreshResult ? "success" : "failed"
    );

    if (!refreshResult) {
      throw new Error("Refresh token request failed");
    }

    const { accessJwt, refreshJwt, did } = refreshResult.data;
    console.log("BlueSky: Got new tokens, verifying DID");

    // Verify the did matches
    if (did !== accountData.platformAccountId) {
      console.error("BlueSky: DID mismatch", {
        receivedDid: did,
        expectedDid: accountData.platformAccountId,
      });
      throw new Error("DID mismatch after token refresh");
    }

    // Update tokens in database
    console.log(
      `BlueSky: Updating tokens in database for ${accountData.platformUsername}`
    );
    const updatedAccount = await SocialAccount.findOneAndUpdate(
      {
        platformAccountId: accountData.platformAccountId,
        platform: "bluesky",
      },
      {
        $set: {
          accessToken: accessJwt,
          refreshToken: refreshJwt,
          status: "active",
          errorMessage: null,
          tokenExpiry: new Date(Date.now() + 12 * 60 * 60 * 1000), // Set expiry to 12 hours from now for better reliability
        },
      },
      { new: true }
    );

    if (!updatedAccount) {
      console.error("BlueSky: Database update failed for token refresh");
      throw new Error("Failed to update account in database");
    }

    console.log("BlueSky: Token refresh completed successfully");
    const result = {
      accessToken: accessJwt,
      refreshToken: refreshJwt,
    };

    // Resolve the promise to unlock any waiting refreshes
    resolveRefreshLock(result);
    return result;
  } catch (error) {
    console.error("BlueSky: Token refresh failed:", error);
    console.error("BlueSky: Error details:", {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      errorStatus: error.status,
      errorResponse: error.response
        ? JSON.stringify(error.response)
        : "No response data",
    });

    // Update account status to error in database
    try {
      await SocialAccount.findOneAndUpdate(
        {
          platformAccountId: accountData.platformAccountId,
          platform: "bluesky",
        },
        {
          $set: {
            status: "error",
            errorMessage: `Token refresh failed: ${error.message}`,
          },
        }
      );
    } catch (dbError) {
      console.error("BlueSky: Error updating account status:", dbError);
    }

    // Reject the promise to indicate failure to waiting refreshes
    rejectRefreshLock(error);
    return null;
  } finally {
    // After a delay, clear the lock to allow future refresh attempts
    setTimeout(() => {
      if (tokenRefreshLocks.get(accountId) === refreshPromise) {
        tokenRefreshLocks.delete(accountId);
      }
    }, 5000); // 5 second cooldown before allowing another refresh
  }
};

/**
 * Handles authentication with token refresh if needed
 * @param {BskyAgent} agent - Bluesky agent instance
 * @param {object} accountData - Account data with tokens
 * @returns {Promise<object>} Updated account data or throws error
 */
const handleAuthentication = async (agent, accountData) => {
  try {
    console.log("BlueSky: Authenticating with session data", {
      username: accountData.platformUsername,
      hasAccessToken: !!accountData.accessToken,
      hasRefreshToken: !!accountData.refreshToken,
      tokenExpiry: accountData.tokenExpiry || "not set",
    });

    // Check if token is about to expire (10 minutes threshold)
    const TOKEN_EXPIRY_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
    const currentTime = Date.now();
    const tokenExpiryTime = accountData.tokenExpiry
      ? new Date(accountData.tokenExpiry).getTime()
      : 0;
    const timeUntilExpiry = tokenExpiryTime - currentTime;

    console.log("BlueSky: Token expiry check", {
      currentTime,
      tokenExpiryTime,
      timeUntilExpiry,
      tokenExpiryThreshold: TOKEN_EXPIRY_THRESHOLD_MS,
    });

    const shouldRefreshToken =
      accountData.tokenExpiry && timeUntilExpiry < TOKEN_EXPIRY_THRESHOLD_MS;

    if (shouldRefreshToken) {
      console.log("BlueSky: Token expiring soon, proactively refreshing");
      const refreshedTokens = await refreshTokenAndUpdate(agent, accountData);

      if (!refreshedTokens) {
        throw new Error(
          "Failed to refresh tokens. Please try posting again or reconnect your Bluesky account."
        );
      }

      // Try resuming with new tokens
      console.log("BlueSky: Resuming session with refreshed tokens");
      await agent.resumeSession({
        did: accountData.platformAccountId,
        handle: accountData.platformUsername,
        accessJwt: refreshedTokens.accessToken,
        refreshJwt: refreshedTokens.refreshToken,
      });

      // Return updated account data
      return {
        ...accountData,
        accessToken: refreshedTokens.accessToken,
        refreshToken: refreshedTokens.refreshToken,
      };
    }

    // Try to resume session with current tokens
    console.log("BlueSky: Resuming session with existing tokens");
    await agent.resumeSession({
      did: accountData.platformAccountId,
      handle: accountData.platformUsername,
      accessJwt: accountData.accessToken,
      refreshJwt: accountData.refreshToken,
    });

    console.log("BlueSky: Session resumed successfully");
    return accountData; // Current tokens worked fine
  } catch (error) {
    console.error("BlueSky: Authentication error:", {
      errorName: error.name,
      errorMessage: error.message,
      errorStatus: error.status || "N/A",
    });

    // If token expired, try to refresh
    if (error.message && error.message.includes("Token has expired")) {
      console.log("BlueSky: Access token expired, attempting refresh");

      const refreshedTokens = await refreshTokenAndUpdate(agent, accountData);

      if (!refreshedTokens) {
        throw new Error(
          "Failed to refresh tokens. Please try posting again or reconnect your Bluesky account."
        );
      }

      // Try resuming with new tokens
      console.log(
        "BlueSky: Resuming session with newly refreshed tokens after expiry"
      );
      await agent.resumeSession({
        did: accountData.platformAccountId,
        handle: accountData.platformUsername,
        accessJwt: refreshedTokens.accessToken,
        refreshJwt: refreshedTokens.refreshToken,
      });

      // Return updated account data
      return {
        ...accountData,
        accessToken: refreshedTokens.accessToken,
        refreshToken: refreshedTokens.refreshToken,
      };
    }

    // For other errors, rethrow with more context
    throw new Error(`Authentication failed: ${error.message}`);
  }
};

/**
 * Posts content to a Bluesky account
 * @param {object} accountData - Account data including tokens
 * @param {object} postData - Post content and media
 * @returns {Promise<object>} Result object
 */
const post = async (accountData, postData) => {
  console.log("BlueSky service: Starting post operation", {
    accountId: accountData.id,
    platform: accountData.platform,
    username: accountData.platformUsername,
    contentType: postData.contentType,
  });

  // Initialize Bluesky agent with correct configuration
  const agent = new BskyAgent({
    service: BSKY_SERVICE_URL,
  });

  const mediaUploadResults = [];

  try {
    // Validate account data
    if (!accountData.accessToken || !accountData.refreshToken) {
      console.error("BlueSky: Missing required tokens", {
        hasAccessToken: !!accountData.accessToken,
        hasRefreshToken: !!accountData.refreshToken,
      });
      throw new Error("Missing authorization tokens for Bluesky");
    }

    // 1. Authentication with token refresh if needed
    console.log("BlueSky: Attempting authentication");
    const updatedAccountData = await handleAuthentication(agent, accountData);

    // If tokens were refreshed, use the updated versions
    if (updatedAccountData.accessToken !== accountData.accessToken) {
      console.log("BlueSky: Tokens were refreshed during authentication");
      accountData = updatedAccountData;
    }

    // 2. Prepare post text
    let postText = "";
    if (postData.contentType === "text") {
      postText = postData.text || "";
    } else if (postData.contentType === "media") {
      if (postData.captions?.mode === "single") {
        postText = postData.captions.single || "";
      } else if (postData.captions?.mode === "multiple") {
        postText =
          postData.captions?.multipleCaptions?.[accountData.id] ||
          postData.captions?.single ||
          "";
      }
    }

    // 3. Process media if present
    const images = [];
    let videoEmbed = null;

    if (postData.media && postData.media.length > 0) {
      console.log(`BlueSky: Processing ${postData.media.length} media items`);

      // Log detailed media info to help debug
      console.log(
        "BlueSky: Media items details:",
        postData.media.map((item) => ({
          type: item.type || "unknown",
          originalName: item.originalName || "unknown",
          size: item.size || "unknown",
          url: item.url ? item.url.substring(0, 60) + "..." : "missing",
          hasAltText: !!item.altText,
        }))
      );

      // Determine the media type for proper handling
      const isVideo = (item) => {
        // First check the type property
        if (
          item.type &&
          (item.type.startsWith("video/") ||
            item.type.includes("video") ||
            item.type === "video/quicktime" ||
            item.type === "video/mp4")
        ) {
          return true;
        }

        // Check if it's marked as a direct upload video
        if (item.isDirectUploadVideo) {
          return true;
        }

        // Check filename extensions
        const videoExtensions = [
          ".mp4",
          ".mov",
          ".webm",
          ".mpeg",
          ".mpg",
          ".m4v",
          ".avi",
        ];
        if (item.originalName) {
          const filename = item.originalName.toLowerCase();
          return videoExtensions.some((ext) => filename.endsWith(ext));
        }

        return false;
      };

      // First, process any videos (only one allowed per post)
      for (const mediaItem of postData.media) {
        if (isVideo(mediaItem)) {
          if (videoEmbed) {
            console.log(
              "BlueSky: Only one video allowed per post, skipping additional videos"
            );
            mediaUploadResults.push({
              originalName: mediaItem.originalName,
              status: "skipped",
              error: "Only one video allowed per post",
            });
            continue;
          }

          console.log(
            `BlueSky: Uploading video ${mediaItem.originalName} directly to BlueSky`
          );

          try {
            // Check if we have a direct file object or need to fetch from URL
            if (mediaItem.file) {
              console.log(
                `BlueSky: Using direct file object for ${mediaItem.originalName}`
              );
            } else {
              console.log(
                `BlueSky: Will fetch from URL: ${mediaItem.url.substring(
                  0,
                  30
                )}...`
              );
            }

            const videoResult = await uploadVideo(
              agent,
              mediaItem.url,
              mediaItem
            );

            if (videoResult.success && videoResult.blob) {
              console.log(`BlueSky: Video upload successful, creating embed`);

              // Create a proper video embed with explicit validation to ensure all required fields are present
              const validBlob = videoResult.blob;
              if (!validBlob.ref || !validBlob.mimeType || !validBlob.size) {
                console.error(
                  "BlueSky: Invalid blob structure",
                  JSON.stringify(validBlob)
                );
                throw new Error(
                  "Invalid video blob structure returned from upload"
                );
              }

              videoEmbed = {
                $type: "app.bsky.embed.external",
                external: {
                  uri: mediaItem.url,
                  title: mediaItem.originalName || "Video",
                  description: mediaItem.altText || "Video from Postmore",
                  thumb: validBlob,
                },
              };

              mediaUploadResults.push({
                originalName: mediaItem.originalName,
                status: "success",
                blobCid: validBlob.ref?.$link,
                firebaseUrl: videoResult.firebase?.url,
              });
            } else {
              throw new Error(videoResult.error || "Video upload failed");
            }
          } catch (videoError) {
            console.error(`BlueSky: Video upload error: ${videoError.message}`);
            mediaUploadResults.push({
              originalName: mediaItem.originalName,
              status: "failed",
              error: videoError.message,
            });
          }
          continue;
        }

        // Process images
        if (mediaItem.type && mediaItem.type.startsWith("image/")) {
          if (images.length >= MAX_IMAGES_PER_POST) {
            console.log(
              "BlueSky: Maximum image count reached, skipping additional images"
            );
            mediaUploadResults.push({
              originalName: mediaItem.originalName,
              status: "skipped",
              error: "Maximum image count reached",
            });
            continue;
          }

          try {
            console.log(`BlueSky: Uploading image ${mediaItem.originalName}`);
            const response = await fetch(mediaItem.url);
            if (!response.ok) {
              console.error(
                `BlueSky: Failed to fetch image, status: ${response.status}`
              );
              throw new Error(`Fetch failed: ${response.status}`);
            }

            const imageBytes = await response.arrayBuffer();
            console.log(
              `BlueSky: Uploading ${imageBytes.byteLength} bytes for image ${mediaItem.originalName}`
            );

            const uploadResult = await agent.uploadBlob(
              new Uint8Array(imageBytes),
              {
                encoding: mediaItem.type,
              }
            );

            if (uploadResult.success) {
              console.log(
                `BlueSky: Successfully uploaded image ${mediaItem.originalName}`
              );
              images.push({
                image: uploadResult.data.blob,
                alt: mediaItem.altText || mediaItem.originalName || "",
              });

              mediaUploadResults.push({
                originalName: mediaItem.originalName,
                status: "success",
                blobCid: uploadResult.data.blob.ref.$link,
              });
            }
          } catch (uploadError) {
            console.error(
              `BlueSky: Image upload error for ${mediaItem.originalName}:`,
              uploadError
            );
            mediaUploadResults.push({
              originalName: mediaItem.originalName,
              status: "failed",
              error: uploadError.message,
            });
          }
        }
        // Check specifically for video without relying solely on MIME type
        else if (
          mediaItem.type &&
          (mediaItem.type.includes("video") || // Check if type contains 'video'
            mediaItem.originalName?.toLowerCase().endsWith(".mp4") ||
            mediaItem.originalName?.toLowerCase().endsWith(".mov") ||
            mediaItem.originalName?.toLowerCase().endsWith(".webm") ||
            mediaItem.originalName?.toLowerCase().endsWith(".mpeg") ||
            mediaItem.originalName?.toLowerCase().endsWith(".mpg") ||
            mediaItem.originalName?.toLowerCase().endsWith(".m4v"))
        ) {
          console.log(
            `BlueSky: Detected video from filename or partial type match: ${mediaItem.originalName}, type: ${mediaItem.type}`
          );

          // Only process one video per post
          if (videoEmbed) {
            console.log(
              "BlueSky: Only one video allowed per post, skipping additional videos"
            );
            mediaUploadResults.push({
              originalName: mediaItem.originalName,
              status: "skipped",
              error: "Only one video allowed per post",
            });
            continue;
          }

          // Set a default video type if needed
          const videoType = mediaItem.type || "video/mp4";
          console.log(
            `BlueSky: Using video type: ${videoType} for ${mediaItem.originalName}`
          );

          try {
            console.log(
              `BlueSky: Processing video with inferred type ${mediaItem.originalName}`
            );
            // Pass mediaItem with corrected type
            const videoItemWithType = {
              ...mediaItem,
              type: videoType,
            };

            const videoResult = await uploadVideo(
              agent,
              mediaItem.url,
              videoItemWithType
            );

            if (videoResult.success) {
              videoEmbed = {
                $type: "app.bsky.embed.video",
                video: videoResult.blob,
                alt: mediaItem.altText || mediaItem.originalName || "",
              };

              mediaUploadResults.push({
                originalName: mediaItem.originalName,
                status: "success",
                blobCid: videoResult.blob.ref.$link,
              });
            } else {
              mediaUploadResults.push({
                originalName: mediaItem.originalName,
                status: "failed",
                error: videoResult.error,
              });
            }
          } catch (uploadError) {
            console.error(
              `BlueSky: Video upload error for ${mediaItem.originalName}:`,
              uploadError
            );
            mediaUploadResults.push({
              originalName: mediaItem.originalName,
              status: "failed",
              error: uploadError.message,
            });
          }
        }
        // Other media types
        else {
          // Add debug logging to see if we're getting here with video/quicktime
          console.log(`BlueSky: DEBUG - Media not recognized properly:`, {
            type: mediaItem.type,
            isVideoQuicktime: mediaItem.type === "video/quicktime",
            hasAllowedVideoFormats: !!ALLOWED_VIDEO_FORMATS,
            allowedCount: ALLOWED_VIDEO_FORMATS
              ? ALLOWED_VIDEO_FORMATS.length
              : 0,
            quicktimeInAllowed: ALLOWED_VIDEO_FORMATS
              ? ALLOWED_VIDEO_FORMATS.includes("video/quicktime")
              : false,
            originalName: mediaItem.originalName || "unknown",
          });

          // For video files that may have incorrect MIME type or need special handling
          if (
            mediaItem.type === "video/quicktime" ||
            mediaItem.originalName?.toLowerCase().endsWith(".mov") ||
            mediaItem.originalName?.toLowerCase().endsWith(".mp4")
          ) {
            console.log(
              `BlueSky: Special handling for possible video ${mediaItem.originalName}`
            );

            // Only process one video per post
            if (videoEmbed) {
              console.log(
                "BlueSky: Only one video allowed per post, skipping additional videos"
              );
              mediaUploadResults.push({
                originalName: mediaItem.originalName,
                status: "skipped",
                error: "Only one video allowed per post",
              });
              continue;
            }

            try {
              // Determine best MIME type based on file extension
              let mimeType = mediaItem.type;
              if (mediaItem.originalName?.toLowerCase().endsWith(".mov")) {
                mimeType = "video/quicktime";
              } else if (
                mediaItem.originalName?.toLowerCase().endsWith(".mp4")
              ) {
                mimeType = "video/mp4";
              }

              const modifiedMediaItem = {
                ...mediaItem,
                type: mimeType,
              };

              console.log(
                `BlueSky: Processing video with determined type ${mimeType} for ${mediaItem.originalName}`
              );
              const videoResult = await uploadVideo(
                agent,
                mediaItem.url,
                modifiedMediaItem
              );

              if (videoResult.success) {
                videoEmbed = {
                  $type: "app.bsky.embed.video",
                  video: videoResult.blob,
                  alt: mediaItem.altText || mediaItem.originalName || "",
                };

                mediaUploadResults.push({
                  originalName: mediaItem.originalName,
                  status: "success",
                  blobCid: videoResult.blob.ref.$link,
                });

                // Skip the normal "add as link" logic
                continue;
              } else {
                mediaUploadResults.push({
                  originalName: mediaItem.originalName,
                  status: "failed",
                  error: videoResult.error,
                });
              }
            } catch (uploadError) {
              console.error(
                `BlueSky: Video upload error for ${mediaItem.originalName}:`,
                uploadError
              );
              mediaUploadResults.push({
                originalName: mediaItem.originalName,
                status: "failed",
                error: uploadError.message,
              });
            }
          } else {
            // Handle truly unsupported media types as links
            console.log(
              `BlueSky: Unsupported media type: ${
                mediaItem.type || "unknown type"
              } for file ${mediaItem.originalName || "unknown"}`
            );
            if (postText) postText += "\n\n";
            postText += `Media: ${mediaItem.url}`;

            mediaUploadResults.push({
              originalName: mediaItem.originalName,
              status: "linked",
              message: "Unsupported media type added as link",
            });
          }
        }
      }
    }

    // 4. Create post record
    const record = {
      text: postText,
      createdAt: new Date().toISOString(),
    };

    // 5. Add media embeds if available - prioritize video over images
    if (videoEmbed) {
      record.embed = videoEmbed;
      console.log("BlueSky: Added video embed to post record");
    } else if (images.length > 0) {
      record.embed = {
        $type: "app.bsky.embed.images",
        images: images,
      };
      console.log(
        `BlueSky: Added image embed with ${images.length} images to post record`
      );
    }

    // Log the record structure for debugging
    console.log("BlueSky: Final post record structure:", {
      hasText: !!record.text?.trim(),
      textLength: record.text?.length || 0,
      embedType: record.embed?.$type || "none",
      hasImages: record.embed?.$type === "app.bsky.embed.images",
      imageCount:
        record.embed?.$type === "app.bsky.embed.images"
          ? record.embed.images?.length
          : 0,
      hasVideo:
        record.embed?.$type === "app.bsky.embed.external" ||
        record.embed?.$type === "app.bsky.embed.video",
      videoDetails:
        record.embed?.$type === "app.bsky.embed.external" ||
        record.embed?.$type === "app.bsky.embed.video"
          ? {
              hasVideoBlob:
                !!record.embed?.external?.thumb || !!record.embed?.video,
              hasAlt: true,
            }
          : null,
    });

    // Validate content existence
    if (!postText.trim() && images.length === 0 && !videoEmbed) {
      console.error("BlueSky: Empty post content");
      return {
        success: false,
        message: "Post must contain text or media",
        platform: "bluesky",
        mediaUploadResults,
      };
    }

    // Publish the post
    console.log(`BlueSky: Publishing post`);
    try {
      // We'll use the direct API method to have more control over the embed structure
      const postResponse = await agent.api.app.bsky.feed.post.create(
        { repo: agent.session.did },
        record
      );

      if (!postResponse || !postResponse.success) {
        throw new Error("Failed to publish post");
      }

      // Log the post success
      console.log(`BlueSky: Post successful`, {
        uri: postResponse.uri,
        cid: postResponse.cid,
      });

      // Return the post details
      return {
        success: true,
        message: "Post successfully published to Bluesky",
        platform: "bluesky",
        postId: postResponse.cid,
        postUri: postResponse.uri,
        postUrl: `https://bsky.app/profile/${
          accountData.platformUsername
        }/post/${postResponse.uri.split("/").pop()}`,
        mediaUploadResults,
      };
    } catch (postError) {
      console.error("BlueSky: Post error:", postError);
      return {
        success: false,
        message: "Failed to publish post",
        platform: "bluesky",
        mediaUploadResults,
        error: {
          name: postError.name,
          message: postError.message,
        },
      };
    }
  } catch (error) {
    console.error("BlueSky service error:", error);
    console.error("BlueSky error details:", {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      errorStatus: error.status,
    });

    // Handle specific error types
    let errorMessage = "Failed to post to Bluesky";
    let errorCode = "unknown_error";

    if (error.message) {
      // Authentication and token errors
      if (
        error.message.toLowerCase().includes("token") ||
        error.message.toLowerCase().includes("auth") ||
        error.message.toLowerCase().includes("reconnect")
      ) {
        errorMessage =
          "Authentication failed. Please try posting again or reconnect your Bluesky account.";
        errorCode = "auth_error";
      }
      // Add the error message for other errors
      else {
        errorMessage += `: ${error.message}`;
      }
    }

    try {
      // Update account status in the database if it's an auth error
      if (
        errorCode === "auth_error" &&
        accountData &&
        accountData.platformAccountId
      ) {
        console.log(
          "BlueSky: Updating account status to error due to auth failure"
        );
        await SocialAccount.findOneAndUpdate(
          {
            platformAccountId: accountData.platformAccountId,
            platform: "bluesky",
          },
          {
            $set: {
              status: "error",
              errorMessage: `Post failed: ${error.message}`,
            },
          }
        );
      }
    } catch (dbError) {
      console.error("BlueSky: Error updating account status:", dbError);
    }

    return {
      success: false,
      message: errorMessage,
      errorCode: errorCode,
      platform: "bluesky",
      mediaUploadResults,
      error: {
        message: error.message,
        name: error.name,
        status: error.status,
      },
    };
  }
};

/**
 * Force refresh tokens for a Bluesky account
 * This can be called from API routes to manually trigger refresh
 * @param {string} accountId - Database ID of the account to refresh
 * @returns {Promise<object>} Result with success status and message
 */
const forceRefreshTokens = async (accountId) => {
  try {
    console.log(`BlueSky: Force refreshing tokens for account ${accountId}`);

    // Find the account in the database
    const account = await SocialAccount.findOne({
      _id: accountId,
      platform: "bluesky",
    });

    if (!account) {
      console.error(
        `BlueSky: Account ${accountId} not found for token refresh`
      );
      return {
        success: false,
        message: "Account not found",
        errorCode: "account_not_found",
      };
    }

    console.log(
      `BlueSky: Found account for refresh: ${account.platformUsername}`
    );

    // Check if refresh token exists
    if (!account.refreshToken) {
      console.error(`BlueSky: Account ${accountId} has no refresh token`);
      return {
        success: false,
        message:
          "No refresh token available. Please reconnect your Bluesky account.",
        errorCode: "no_refresh_token",
      };
    }

    // Create a Bluesky agent with correct configuration
    const agent = new BskyAgent({
      service: BSKY_SERVICE_URL,
    });

    // Extract account data needed for refresh
    const accountData = {
      platformUsername: account.platformUsername,
      platformAccountId: account.platformAccountId,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      tokenExpiry: account.tokenExpiry,
    };

    // Attempt to refresh the token
    const refreshedTokens = await refreshTokenAndUpdate(agent, accountData);

    if (!refreshedTokens) {
      return {
        success: false,
        message:
          "Token refresh failed. You may need to reconnect your Bluesky account.",
        errorCode: "refresh_failed",
      };
    }

    return {
      success: true,
      message: "Bluesky tokens refreshed successfully",
      status: "active",
    };
  } catch (error) {
    console.error("BlueSky: Force refresh error:", error);
    return {
      success: false,
      message: `Failed to refresh tokens: ${error.message}`,
      errorCode: "refresh_error",
      error: {
        name: error.name,
        message: error.message,
      },
    };
  }
};

export default {
  post,
  forceRefreshTokens,
  editPost,
  deletePost,
  deletePosts,
};
