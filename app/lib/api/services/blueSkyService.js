import { BskyAgent } from "@atproto/api";

// The main Bluesky service endpoint
const BSKY_SERVICE_URL = "https://bsky.social";
const MAX_IMAGE_SIZE_BYTES = 1000000; // 1MB
const MAX_IMAGES_PER_POST = 4;

/**
 * Posts content to a Bluesky account using token-based session resumption
 * and handles media uploads (images as blobs, videos as links in text).
 *
 * @param {object} accountData - Data for the Bluesky account.
 * @param {string} accountData.platformUsername - The user's Bluesky handle (e.g., "username.bsky.social").
 * @param {string} accountData.platformAccountId - The user's Bluesky DID (e.g., "did:plc:...").
 * @param {string} accountData.accessToken - The access token for Bluesky.
 * @param {string} accountData.refreshToken - The refresh token for Bluesky.
 * @param {string} accountData.id - The internal account ID.
 * @param {object} postData - The content to be posted.
 * @param {string} postData.contentType - The type of post ("text" or "media").
 * @param {string} [postData.text] - The text content of the post (used for text-only or as base for media posts).
 * @param {Array<object>} [postData.media] - Array of media items. Each item should have { url, type, size, originalName, altText? }.
 * @param {object} [postData.captions] - Caption data with format {mode: "single"|"multiple", single: "text", multipleCaptions: {accountId: "text"}}.
 * @returns {Promise<object>} - A promise that resolves to a standardized result object.
 */
const post = async (accountData, postData) => {
  console.log(
    "BlueSky service received account data (tokens redacted):",
    JSON.stringify({
      platformUsername: accountData.platformUsername,
      platformAccountId: accountData.platformAccountId,
      id: accountData.id,
    })
  );
  console.log("BlueSky service received post data:", JSON.stringify(postData));

  const agent = new BskyAgent({ service: BSKY_SERVICE_URL });
  const mediaUploadResults = [];
  const accountId = accountData.id; // For captions

  try {
    // 1. AUTHENTICATION - Resume session
    console.log("Attempting to resume session with Bluesky...");
    const sessionData = {
      handle: accountData.platformUsername,
      did: accountData.platformAccountId,
      accessJwt: accountData.accessToken,
      refreshJwt: accountData.refreshToken,
      // Assuming the PDS is the main Bluesky service for all users
      // This might need to be configurable if users can be on different PDS instances
      pds: BSKY_SERVICE_URL,
    };
    await agent.resumeSession(sessionData);
    console.log("Successfully resumed session with Bluesky.");

    // 2. PREPARE BASE POST TEXT
    let postText = "";
    if (postData.contentType === "text") {
      postText = postData.text || "";
    } else if (postData.contentType === "media") {
      if (postData.captions?.mode === "single") {
        postText = postData.captions.single || "";
      } else if (postData.captions?.mode === "multiple") {
        postText =
          postData.captions?.multipleCaptions?.[accountId] ||
          postData.captions?.single ||
          "";
      }
    }

    // 3. MEDIA PROCESSING
    const mediaToProcess = postData.media || [];
    console.log(
      "BlueSky: Media items to process:",
      JSON.stringify(
        mediaToProcess.map((item) => ({
          type: item.type,
          url: item.url ? "exists" : "missing",
          size: item.size,
          originalName: item.originalName || item.name || "unnamed-file",
        })),
        null,
        2
      )
    );

    if (mediaToProcess.length > 0 && postData.contentType === "media") {
      // Check if any media item is missing a URL
      const missingUrlItems = mediaToProcess.filter((item) => !item.url);
      if (missingUrlItems.length > 0) {
        console.error(
          "BlueSky: Some media items are missing URLs:",
          missingUrlItems.map((i) => i.originalName || i.name || "unnamed")
        );
        return {
          success: false,
          message:
            "Some media items are missing URLs. Ensure all files are uploaded properly first.",
          platform: "bluesky",
          error: new Error("Media items missing URLs"),
        };
      }
    }

    // Validate each media item has the required properties
    const validatedMedia = mediaToProcess
      .map((item) => {
        try {
          // If the item is from the client-side without being processed by the API manager
          if (item.fileInfo) {
            console.log(
              `BlueSky: Processing client-side media item: ${item.fileInfo.name}`
            );
            const validItem = {
              url: item.url, // This should exist if it's been uploaded to Firebase
              type: item.fileInfo.type || "unknown/unknown",
              size: item.fileInfo.size || 0,
              originalName: item.fileInfo.name || "unnamed-file",
            };

            if (!validItem.url) {
              console.warn(
                `BlueSky: Skipping media item without URL:`,
                JSON.stringify(item)
              );
              return null;
            }

            return validItem;
          }

          // Normal case, already processed by API manager
          const validItem = {
            ...item,
            url: item.url,
            type: item.type || "unknown/unknown",
            size: item.size || 0,
            originalName: item.originalName || item.name || "unnamed-file",
          };

          if (!validItem.url) {
            console.warn(
              `BlueSky: Skipping media item without URL:`,
              JSON.stringify(item)
            );
            return null;
          }

          return validItem;
        } catch (itemError) {
          console.error(
            "BlueSky: Error processing media item:",
            itemError,
            "Item:",
            JSON.stringify(item)
          );
          return null;
        }
      })
      .filter((item) => item !== null);

    // Check if we've lost any media items due to validation
    if (mediaToProcess.length > 0 && validatedMedia.length === 0) {
      console.error("BlueSky: All media items failed validation");
      return {
        success: false,
        message:
          "All media items failed validation. Check URLs and file types.",
        platform: "bluesky",
        error: new Error("Media validation failure"),
      };
    }

    const imageItems = validatedMedia.filter((m) =>
      m.type?.startsWith("image/")
    );
    const videoItems = validatedMedia.filter((m) =>
      m.type?.startsWith("video/")
    );

    console.log(
      `BlueSky: Processed ${imageItems.length} images and ${videoItems.length} videos`
    );

    const successfullyEmbeddedImages = [];
    let imagesAttemptedCount = 0;

    for (const imageItem of imageItems) {
      if (imagesAttemptedCount >= MAX_IMAGES_PER_POST) {
        console.log(
          `Skipping image ${imageItem.originalName} due to max image limit (${MAX_IMAGES_PER_POST}).`
        );
        mediaUploadResults.push({
          originalName: imageItem.originalName,
          type: imageItem.type,
          status: "skipped_limit",
          message: `Skipped: Maximum ${MAX_IMAGES_PER_POST} images allowed.`,
        });
        continue;
      }

      if (imageItem.size > MAX_IMAGE_SIZE_BYTES) {
        console.warn(
          `Image ${imageItem.originalName} too large (${imageItem.size} bytes), skipping.`
        );
        mediaUploadResults.push({
          originalName: imageItem.originalName,
          type: imageItem.type,
          status: "skipped_size",
          message: `Skipped: Image size ${imageItem.size} bytes exceeds limit of ${MAX_IMAGE_SIZE_BYTES} bytes.`,
        });
        continue;
      }

      imagesAttemptedCount++;
      let currentImageUploadSuccess = false;

      try {
        console.log(`Fetching image from URL: ${imageItem.url}`);
        const response = await fetch(imageItem.url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch image ${imageItem.originalName} from ${imageItem.url}: ${response.status} ${response.statusText}`
          );
        }
        const imageBytes = await response.arrayBuffer();

        console.log(`Uploading image ${imageItem.originalName} to Bluesky...`);
        const uploadedBlobResponse = await agent.uploadBlob(
          new Uint8Array(imageBytes),
          {
            encoding: imageItem.type,
          }
        );

        if (!uploadedBlobResponse.success || !uploadedBlobResponse.data.blob) {
          throw new Error(
            "Bluesky blob upload failed or returned unexpected structure."
          );
        }
        console.log(
          `Image ${imageItem.originalName} uploaded:`,
          uploadedBlobResponse.data.blob.cid
        );

        successfullyEmbeddedImages.push({
          image: uploadedBlobResponse.data.blob,
          alt: imageItem.altText || imageItem.originalName || "",
        });
        mediaUploadResults.push({
          originalName: imageItem.originalName,
          type: imageItem.type,
          status: "uploaded",
          blobCid: uploadedBlobResponse.data.blob.cid,
        });
        currentImageUploadSuccess = true;
      } catch (uploadError) {
        console.error(
          `Failed to process image ${imageItem.originalName}:`,
          uploadError
        );
        mediaUploadResults.push({
          originalName: imageItem.originalName,
          type: imageItem.type,
          status: uploadError.message.includes("Failed to fetch")
            ? "failed_fetch"
            : "failed_upload",
          error: uploadError.message,
        });
      }
    }

    // Append video URLs to postText
    if (videoItems.length > 0) {
      // Create a more descriptive format for video URLs
      let videoText = "";

      if (postText) {
        // If there's already text, add a separator
        videoText += "\n\n";
      }

      videoText += "Watch video" + (videoItems.length > 1 ? "s" : "") + ":\n";

      // Add each video with its name (if available)
      videoItems.forEach((v, index) => {
        const videoName = v.originalName || `Video ${index + 1}`;
        videoText += `${videoName}: ${v.url}\n`;

        mediaUploadResults.push({
          originalName: v.originalName,
          type: v.type,
          status: "linked_in_text",
        });
      });

      postText += videoText;
    }

    // 4. VALIDATE CONTENT AVAILABILITY
    if (!postText.trim() && successfullyEmbeddedImages.length === 0) {
      console.error(
        "Post attempt failed: No text or successfully embedded images."
      );
      return {
        success: false,
        message: "Post content (text or images) is required for Bluesky.",
        platform: "bluesky",
        mediaUploadResults,
        error: new Error("No content to post."),
      };
    }

    // 5. PREPARE THE POST RECORD
    const record = {
      text: postText,
      createdAt: new Date().toISOString(),
      // langs: ['en'] // Optional: specify language(s)
    };

    if (successfullyEmbeddedImages.length > 0) {
      record.embed = {
        $type: "app.bsky.embed.images",
        images: successfullyEmbeddedImages,
      };
    }

    // 6. CREATE THE POST
    console.log(
      "Creating post on Bluesky with record:",
      JSON.stringify(record, null, 2)
    );
    const blueskyPostResponse = await agent.post(record);
    console.log("Post created successfully on Bluesky:", blueskyPostResponse);

    const rkey = blueskyPostResponse.uri.split("/").pop();
    const postUrl = `https://bsky.app/profile/${accountData.platformUsername}/post/${rkey}`;

    return {
      success: true,
      message: "Post successfully published to Bluesky.",
      platform: "bluesky",
      postId: blueskyPostResponse.cid,
      postUrl: postUrl,
      mediaUploadResults,
      platformResponse: blueskyPostResponse,
    };
  } catch (error) {
    console.error("Bluesky service error:", error);
    let errorMessage = "Failed to post to Bluesky.";
    if (error.message) {
      errorMessage += `: ${error.message}`;
    }
    // Check for specific authentication-related errors from resumeSession
    if (
      error.message &&
      (error.message.toLowerCase().includes("invalid token") ||
        error.message.toLowerCase().includes("expired token") ||
        error.message.toLowerCase().includes("authentication required"))
    ) {
      errorMessage =
        "Bluesky authentication failed. Please re-authenticate the account. Your session may have expired or tokens are invalid.";
    } else if (
      error.status === 400 &&
      error.message &&
      error.message.toLowerCase().includes("bad request")
    ) {
      errorMessage =
        "Bluesky API returned Bad Request. This could be due to malformed data or invalid parameters. " +
        error.message;
    }

    return {
      success: false,
      message: errorMessage,
      platform: "bluesky",
      mediaUploadResults, // Include partial results if any
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack, // Consider if stack should be returned
        status: error.status, // If ATProtoError
      },
    };
  }
};

export default {
  post,
};
