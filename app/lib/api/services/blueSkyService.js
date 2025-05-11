import { BskyAgent } from "@atproto/api";

// The main Bluesky service endpoint
const BSKY_SERVICE_URL = "https://bsky.social";

/**
 * Posts content to a Bluesky account.
 *
 * @param {object} accountData - Data for the Bluesky account.
 * @param {string} accountData.identifier - The user's Bluesky handle (e.g., "username.bsky.social").
 * @param {string} accountData.appPassword - The user-generated App Password for this application. **MUST NOT** be the main account password.
 * @param {object} postData - The content to be posted.
 * @param {string} postData.textContent - The text content of the post.
 * @param {Array<File|string>} [postData.mediaFiles] - Array of media files (currently not implemented for Bluesky).
 * @returns {Promise<object>} - A promise that resolves to a standardized result object.
 *                             Example success: { success: true, message: "...", platform: "bluesky", postId: "...", postUrl: "..." }
 *                             Example error: { success: false, message: "...", platform: "bluesky", error: ... }
 */
const post = async (accountData, postData) => {
  const { identifier, appPassword } = accountData;
  const { textContent /*, mediaFiles */ } = postData; // mediaFiles placeholder for future use

  if (!identifier || !appPassword) {
    return {
      success: false,
      message: "Bluesky identifier (handle) and App Password are required.",
      platform: "bluesky",
      error: new Error("Missing credentials"),
    };
  }

  if (!textContent) {
    // TODO: Add check for mediaFiles once implemented
    return {
      success: false,
      message: "Post content (text or media) is required for Bluesky.",
      platform: "bluesky",
      error: new Error("Missing post content"),
    };
  }

  const agent = new BskyAgent({ service: BSKY_SERVICE_URL });

  try {
    // 1. Login using the App Password
    await agent.login({
      identifier,
      password: appPassword, // Use the App Password here
    });

    // 2. Prepare the post record
    // The SDK automatically handles facets (links, mentions)
    const record = {
      text: textContent,
      createdAt: new Date().toISOString(),
      // TODO: Add embed for images/media using agent.uploadBlob
      // Example (pseudo-code):
      // if (mediaFiles && mediaFiles.length > 0) {
      //   const uploadedBlobs = await Promise.all(mediaFiles.map(file => agent.uploadBlob(file /* needs correct format */)));
      //   record.embed = {
      //     $type: 'app.bsky.embed.images',
      //     images: uploadedBlobs.map(blobRes => ({ image: blobRes.data.blob, alt: '...' /* Add alt text */ }))
      //   };
      // }
    };

    // 3. Create the post
    const response = await agent.post(record);

    // 4. Construct the success response
    // Extract the rkey (post ID) from the URI: at://did:plc:.../app.bsky.feed.post/POST_ID
    const rkey = response.uri.split("/").pop();
    const postUrl = `https://bsky.app/profile/${identifier}/post/${rkey}`;

    return {
      success: true,
      message: "Post successfully published to Bluesky.",
      platform: "bluesky",
      postId: response.cid, // Using CID as a unique identifier for the post content
      postUrl: postUrl,
      platformResponse: response, // Include original response for debugging/logging
    };
  } catch (error) {
    console.error("Bluesky API Error:", error);
    // Attempt to provide a more specific error message
    let errorMessage = "Failed to post to Bluesky.";
    if (error.message) {
      errorMessage += `: ${error.message}`;
    }
    if (error.status === 401 || error.status === 400) {
      errorMessage =
        "Bluesky authentication failed. Please check your handle and App Password.";
    }

    return {
      success: false,
      message: errorMessage,
      platform: "bluesky",
      error: error, // Include the original error object
    };
  }
};

export default {
  post,
  // Add other methods like delete, update etc. if needed in the future
};
