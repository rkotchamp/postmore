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
 * @param {string} postData.contentType - The type of post ("text" or "media").
 * @param {string} postData.text - The text content of post (used for text-only posts).
 * @param {Array<object>} [postData.media] - Array of media files from our database.
 * @param {object} [postData.captions] - Caption data with format {mode: "single"|"multiple", single: "text", multipleCaptions: {accountId: "text"}}.
 * @returns {Promise<object>} - A promise that resolves to a standardized result object.
 *                             Example success: { success: true, message: "...", platform: "bluesky", postId: "...", postUrl: "..." }
 *                             Example error: { success: false, message: "...", platform: "bluesky", error: ... }
 */
const post = async (accountData, postData) => {
  console.log(
    "BlueSky service received account data:",
    JSON.stringify({
      ...accountData,
      appPassword: "REDACTED", // Don't log the password
    })
  );
  console.log("BlueSky service received post data:", JSON.stringify(postData));

  // Extract account credentials
  const { identifier, appPassword } = accountData;
  const accountId = accountData.id;

  // Get the appropriate text content based on content type and caption mode
  let postText = "";

  if (postData.contentType === "text") {
    // For text-only posts, use the text field
    postText = postData.text || "";
  } else if (postData.contentType === "media") {
    // For media posts, use the appropriate caption
    if (postData.captions?.mode === "single") {
      postText = postData.captions.single || "";
    } else if (postData.captions?.mode === "multiple") {
      // Use the account-specific caption or fall back to single caption
      postText =
        postData.captions?.multipleCaptions?.[accountId] ||
        postData.captions?.single ||
        "";
    }
  }

  const media = postData.media || [];

  // Validate required fields
  if (!identifier || !appPassword) {
    return {
      success: false,
      message: "Bluesky identifier (handle) and App Password are required.",
      platform: "bluesky",
      error: new Error("Missing credentials"),
    };
  }

  if (!postText) {
    return {
      success: false,
      message: "Post content (text) is required for Bluesky.",
      platform: "bluesky",
      error: new Error("Missing post content"),
    };
  }

  console.log(
    `Attempting to post to Bluesky as ${identifier}: "${postText.substring(
      0,
      50
    )}..."`
  );

  const agent = new BskyAgent({ service: BSKY_SERVICE_URL });

  try {
    // 1. Login using the App Password
    console.log("Logging in to Bluesky...");
    await agent.login({
      identifier,
      password: appPassword, // Use the App Password here
    });
    console.log("Successfully logged in to Bluesky");

    // 2. Prepare the post record
    const record = {
      text: postText,
      createdAt: new Date().toISOString(),
    };

    // 3. Prepare media if available (not fully implemented yet)
    // This code is a placeholder for future implementation
    if (media && media.length > 0) {
      console.log(
        "Media files found, but not yet implemented for Bluesky posts"
      );
      // The below code is commented out as it's not fully implemented yet
      /*
      try {
        // For testing purposes, log media info
        console.log(`Found ${media.length} media files to upload`);
        media.forEach((m, i) => {
          console.log(`Media ${i+1}: ${m.url ? m.url : 'No URL'}`);
        });
        
        // Handle images here when implemented
      } catch (mediaError) {
        console.error("Failed to process media for Bluesky:", mediaError);
      }
      */
    }

    // 4. Create the post
    console.log("Creating post on Bluesky...");
    const response = await agent.post(record);
    console.log("Post created successfully:", response);

    // 5. Construct the success response
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
