import { BskyAgent } from "@atproto/api";
import SocialAccount from "@/app/models/SocialAccount"; // Add import for SocialAccount model

// Import utility files
import { uploadVideo, ALLOWED_VIDEO_FORMATS } from "./videoPostBlueSky";
import { editPost } from "./editBlueSkyPost";
import { deletePost, deletePosts } from "./deleteBlueSkyPost";

// Import postStore to access thumbnails
import { usePostStore } from "@/app/lib/store/postStore";

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
    // Wait for the existing refresh to complete
    try {
      const result = await tokenRefreshLocks.get(accountId);

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
    // Verify we have the required data for refresh
    if (!accountData.refreshToken || !accountData.platformUsername) {
      console.error("BlueSky: Missing refresh token or username", {
        hasRefreshToken: !!accountData.refreshToken,
        hasUsername: !!accountData.platformUsername,
      });
      throw new Error("Missing credentials for token refresh");
    }

    // Login with the username and refresh token

    const refreshResult = await agent.login({
      identifier: accountData.platformUsername,
      refreshJwt: accountData.refreshToken,
    });

    if (!refreshResult) {
      throw new Error("Refresh token request failed");
    }

    const { accessJwt, refreshJwt, did } = refreshResult.data;

    // Verify the did matches
    if (did !== accountData.platformAccountId) {
      console.error("BlueSky: DID mismatch", {
        receivedDid: did,
        expectedDid: accountData.platformAccountId,
      });
      throw new Error("DID mismatch after token refresh");
    }

    // Update tokens in database

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
    // Check if token is about to expire (10 minutes threshold)
    const TOKEN_EXPIRY_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
    const currentTime = Date.now();
    const tokenExpiryTime = accountData.tokenExpiry
      ? new Date(accountData.tokenExpiry).getTime()
      : 0;
    const timeUntilExpiry = tokenExpiryTime - currentTime;

    const shouldRefreshToken =
      accountData.tokenExpiry && timeUntilExpiry < TOKEN_EXPIRY_THRESHOLD_MS;

    if (shouldRefreshToken) {
      const refreshedTokens = await refreshTokenAndUpdate(agent, accountData);

      if (!refreshedTokens) {
        throw new Error(
          "Failed to refresh tokens. Please try posting again or reconnect your Bluesky account."
        );
      }

      // Try resuming with new tokens

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

    await agent.resumeSession({
      did: accountData.platformAccountId,
      handle: accountData.platformUsername,
      accessJwt: accountData.accessToken,
      refreshJwt: accountData.refreshToken,
    });

    return accountData; // Current tokens worked fine
  } catch (error) {
    console.error("BlueSky: Authentication error:", {
      errorName: error.name,
      errorMessage: error.message,
      errorStatus: error.status || "N/A",
    });

    // If token expired, try to refresh
    if (error.message && error.message.includes("Token has expired")) {
      const refreshedTokens = await refreshTokenAndUpdate(agent, accountData);

      if (!refreshedTokens) {
        throw new Error(
          "Failed to refresh tokens. Please try posting again or reconnect your Bluesky account."
        );
      }

      // Try resuming with new tokens

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
  console.log("🔍 BLUESKY: Service called");
  console.log("🔍 BLUESKY: accountData:", JSON.stringify(accountData, null, 2));
  console.log("🔍 BLUESKY: postData:", JSON.stringify(postData, null, 2));
  
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

    const updatedAccountData = await handleAuthentication(agent, accountData);

    // If tokens were refreshed, use the updated versions
    if (updatedAccountData.accessToken !== accountData.accessToken) {
      accountData = updatedAccountData;
    }

    // 2. Prepare post text
    let postText = "";
    console.log("🔍 BLUESKY: Processing captions, contentType:", postData.contentType);
    
    if (postData.contentType === "text") {
      postText = postData.text || "";
      console.log("🔍 BLUESKY: Text post, postText:", postText);
    } else if (postData.contentType === "media") {
      console.log("🔍 BLUESKY: Media post, captions:", JSON.stringify(postData.captions, null, 2));
      if (postData.captions?.mode === "single") {
        postText = postData.captions.single || "";
        console.log("🔍 BLUESKY: Single caption mode, postText:", postText);
      } else if (postData.captions?.mode === "multiple") {
        postText =
          postData.captions?.multiple?.[accountData.id] ||
          postData.captions?.single ||
          "";
        console.log("🔍 BLUESKY: Multiple caption mode, accountData.id:", accountData.id);
        console.log("🔍 BLUESKY: Multiple caption mode, postText:", postText);
      }
    }
    
    console.log("🔍 BLUESKY: Final postText:", postText);

    // 3. Process media if present
    const images = [];
    let videoEmbed = null;

    if (postData.media && postData.media.length > 0) {
      // Log detailed media info to help debug

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
            mediaUploadResults.push({
              originalName: mediaItem.originalName,
              status: "skipped",
              error: "Only one video allowed per post",
            });
            continue;
          }

          try {
            // Check for a thumbnail in the store
            let thumbnailFile = null;
            if (mediaItem.id) {
              thumbnailFile = usePostStore
                .getState()
                .getVideoThumbnail(mediaItem.id);
              if (thumbnailFile) {
              }
            }

            // Check if we have a direct file object or need to fetch from URL

            const videoResult = await uploadVideo(
              agent,
              mediaItem.url,
              mediaItem,
              thumbnailFile // Pass the thumbnail to the upload function
            );

            if (videoResult.success && videoResult.blob) {
              console.log(`BlueSky: Video upload successful, creating embed`);

              // Create an appropriate embed based on what we have
              if (videoResult.thumbBlob) {
                // We have both a video and a thumbnail, so use an external embed with the thumbnail

                videoEmbed = {
                  $type: "app.bsky.embed.external",
                  external: {
                    uri:
                      mediaItem.url ||
                      "https://postmore.app/video/" + mediaItem.id,
                    title: mediaItem.originalName || "Video",
                    description: mediaItem.altText || "Video from Postmore",
                    thumb: videoResult.thumbBlob,
                  },
                };
              } else {
                // We only have the video, so use a video embed

                videoEmbed = {
                  $type: "app.bsky.embed.video",
                  video: videoResult.blob,
                  alt: mediaItem.altText || mediaItem.originalName || "Video",
                };
              }

              mediaUploadResults.push({
                originalName: mediaItem.originalName,
                status: "success",
                blobCid: videoResult.blob.ref?.$link,
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
            mediaUploadResults.push({
              originalName: mediaItem.originalName,
              status: "skipped",
              error: "Maximum image count reached",
            });
            continue;
          }

          try {
            const response = await fetch(mediaItem.url);
            if (!response.ok) {
              console.error(
                `BlueSky: Failed to fetch image, status: ${response.status}`
              );
              throw new Error(`Fetch failed: ${response.status}`);
            }

            const imageBytes = await response.arrayBuffer();

            const uploadResult = await agent.uploadBlob(
              new Uint8Array(imageBytes),
              {
                encoding: mediaItem.type,
              }
            );

            if (uploadResult.success) {
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
          // Only process one video per post
          if (videoEmbed) {
            mediaUploadResults.push({
              originalName: mediaItem.originalName,
              status: "skipped",
              error: "Only one video allowed per post",
            });
            continue;
          }

          // Set a default video type if needed
          const videoType = mediaItem.type || "video/mp4";

          try {
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

          // For video files that may have incorrect MIME type or need special handling
          if (
            mediaItem.type === "video/quicktime" ||
            mediaItem.originalName?.toLowerCase().endsWith(".mov") ||
            mediaItem.originalName?.toLowerCase().endsWith(".mp4")
          ) {
            // Only process one video per post
            if (videoEmbed) {
              mediaUploadResults.push({
                originalName: mediaItem.originalName,
                status: "skipped",
                error: "Only one video allowed per post",
              });
              continue;
            }

            try {
              // Get thumbnail if available
              let thumbnailFile = null;
              if (mediaItem.id) {
                thumbnailFile = usePostStore
                  .getState()
                  .getVideoThumbnail(mediaItem.id);
                if (thumbnailFile) {
                }
              }

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

              const videoResult = await uploadVideo(
                agent,
                mediaItem.url,
                modifiedMediaItem,
                thumbnailFile // Pass the thumbnail
              );

              if (videoResult.success) {
                // Create an appropriate embed based on what we have
                if (videoResult.thumbBlob) {
                  // We have both a video and a thumbnail, so use an external embed with the thumbnail

                  videoEmbed = {
                    $type: "app.bsky.embed.external",
                    external: {
                      uri:
                        mediaItem.url ||
                        "https://postmore.app/video/" + mediaItem.id,
                      title: mediaItem.originalName || "Video",
                      description: mediaItem.altText || "Video from Postmore",
                      thumb: videoResult.thumbBlob,
                    },
                  };
                } else {
                  // We only have the video, so use a video embed

                  videoEmbed = {
                    $type: "app.bsky.embed.video",
                    video: videoResult.blob,
                    alt: mediaItem.altText || mediaItem.originalName || "Video",
                  };
                }

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
    } else if (images.length > 0) {
      record.embed = {
        $type: "app.bsky.embed.images",
        images: images,
      };
    }

    // Log the record structure for debugging

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

    try {
      // We'll use the direct API method to have more control over the embed structure
      const postResponse = await agent.api.app.bsky.feed.post.create(
        { repo: agent.session.did },
        record
      );

      // If we have a cid and uri in the response, the post was successful
      if (!postResponse || (!postResponse.cid && !postResponse.uri)) {
        console.error(
          "BlueSky: Post response missing required fields",
          postResponse
        );
        throw new Error("Failed to publish post");
      }

      // Log the post success

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
