/**
 * Bluesky Post Editing Utilities
 * Handles updating existing posts on Bluesky
 *
 * Note: Bluesky doesn't support true editing, so this creates a new post and deletes the old one
 */

import { BskyAgent } from "@atproto/api";
import SocialAccount from "@/app/models/SocialAccount";

// Constants for Bluesky service
const BSKY_SERVICE_URL = "https://bsky.social";

/**
 * Edit a post on Bluesky (currently only supports updating text/caption)
 * Note: Bluesky doesn't support true editing, so this creates a new post and deletes the old one
 *
 * @param {string} accountId - Database ID of the account
 * @param {string} postUri - URI of the post to edit
 * @param {string} newText - New text/caption for the post
 * @param {boolean} keepMedia - Whether to keep media from the original post
 * @returns {Promise<object>} Result of the edit operation
 */
export const editPost = async (
  accountId,
  postUri,
  newText,
  keepMedia = true
) => {
  console.log(`BlueSky: Editing post ${postUri} for account ${accountId}`);

  try {
    // 1. Find the account in the database
    const account = await SocialAccount.findOne({
      _id: accountId,
      platform: "bluesky",
    });

    if (!account) {
      console.error(`BlueSky: Account ${accountId} not found for editing post`);
      return {
        success: false,
        message: "Account not found",
        errorCode: "account_not_found",
      };
    }

    console.log(
      `BlueSky: Found account for editing: ${account.platformUsername}`
    );

    // 2. Initialize Bluesky agent
    const agent = new BskyAgent({
      service: BSKY_SERVICE_URL,
    });

    // 3. Authenticate with Bluesky
    await agent.resumeSession({
      did: account.platformAccountId,
      handle: account.platformUsername,
      accessJwt: account.accessToken,
      refreshJwt: account.refreshToken,
    });

    // 4. Get the original post
    const originalPostResponse = await agent.getPost({
      uri: postUri,
    });

    if (!originalPostResponse.success) {
      console.error(`BlueSky: Failed to get original post: ${postUri}`);
      return {
        success: false,
        message: "Failed to get original post",
      };
    }

    const originalPost = originalPostResponse.data.post;
    console.log(
      `BlueSky: Retrieved original post with CID: ${originalPost.cid}`
    );

    // 5. Create a new post with updated text
    const newRecord = {
      text: newText.trim(),
      createdAt: new Date().toISOString(),
    };

    // 6. Copy media embed if present and requested
    if (keepMedia && originalPost.embed) {
      if (originalPost.embed.$type === "app.bsky.embed.images") {
        newRecord.embed = originalPost.embed;
      } else if (originalPost.embed.$type === "app.bsky.embed.video") {
        newRecord.embed = originalPost.embed;
      }
      // Note: we could handle other embed types here if needed
    }

    // 7. Create the new post
    console.log(`BlueSky: Creating new post with updated text`);
    const newPostResult = await agent.post(newRecord);

    if (!newPostResult) {
      throw new Error("Failed to create new post");
    }

    // 8. Delete the original post
    console.log(`BlueSky: Deleting original post: ${postUri}`);
    await agent.deletePost(postUri);

    // 9. Return the new post URL
    const rkey = newPostResult.uri.split("/").pop();
    const postUrl = `https://bsky.app/profile/${account.platformUsername}/post/${rkey}`;

    return {
      success: true,
      message: "Post successfully updated",
      newPostUri: newPostResult.uri,
      newPostCid: newPostResult.cid,
      postUrl: postUrl,
    };
  } catch (error) {
    console.error("BlueSky: Edit post error:", error);
    return {
      success: false,
      message: `Failed to edit post: ${error.message}`,
      errorCode: "edit_error",
      error: {
        name: error.name,
        message: error.message,
      },
    };
  }
};
