/**
 * Bluesky Post Deletion Utilities
 * Handles deleting posts on Bluesky
 */

import { BskyAgent } from "@atproto/api";
import SocialAccount from "@/app/models/SocialAccount";

// Constants for Bluesky service
const BSKY_SERVICE_URL = "https://bsky.social";

/**
 * Delete a post on Bluesky
 *
 * @param {string} accountId - Database ID of the account
 * @param {string} postUri - URI of the post to delete
 * @returns {Promise<object>} Result of the delete operation
 */
export const deletePost = async (accountId, postUri) => {
  console.log(`BlueSky: Deleting post ${postUri} for account ${accountId}`);

  try {
    // 1. Find the account in the database
    const account = await SocialAccount.findOne({
      _id: accountId,
      platform: "bluesky",
    });

    if (!account) {
      console.error(
        `BlueSky: Account ${accountId} not found for deleting post`
      );
      return {
        success: false,
        message: "Account not found",
        errorCode: "account_not_found",
      };
    }

    console.log(
      `BlueSky: Found account for deletion: ${account.platformUsername}`
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

    // 4. Delete the post
    console.log(`BlueSky: Deleting post: ${postUri}`);
    await agent.deletePost(postUri);

    return {
      success: true,
      message: "Post successfully deleted",
      postUri,
    };
  } catch (error) {
    console.error("BlueSky: Delete post error:", error);
    return {
      success: false,
      message: `Failed to delete post: ${error.message}`,
      errorCode: "delete_error",
      error: {
        name: error.name,
        message: error.message,
      },
    };
  }
};

/**
 * Delete multiple posts on Bluesky
 *
 * @param {string} accountId - Database ID of the account
 * @param {Array<string>} postUris - Array of URIs of posts to delete
 * @returns {Promise<object>} Result of the bulk delete operation
 */
export const deletePosts = async (accountId, postUris) => {
  console.log(
    `BlueSky: Deleting ${postUris.length} posts for account ${accountId}`
  );

  try {
    // 1. Find the account in the database
    const account = await SocialAccount.findOne({
      _id: accountId,
      platform: "bluesky",
    });

    if (!account) {
      console.error(
        `BlueSky: Account ${accountId} not found for deleting posts`
      );
      return {
        success: false,
        message: "Account not found",
        errorCode: "account_not_found",
      };
    }

    console.log(
      `BlueSky: Found account for deletion: ${account.platformUsername}`
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

    // 4. Delete each post
    const results = [];
    for (const postUri of postUris) {
      try {
        console.log(`BlueSky: Deleting post: ${postUri}`);
        await agent.deletePost(postUri);
        results.push({
          postUri,
          success: true,
        });
      } catch (error) {
        console.error(`BlueSky: Error deleting post ${postUri}:`, error);
        results.push({
          postUri,
          success: false,
          error: error.message,
        });
      }
    }

    // 5. Determine overall success
    const allSucceeded = results.every((result) => result.success);
    const successCount = results.filter((result) => result.success).length;

    return {
      success: allSucceeded,
      message: `Deleted ${successCount} of ${postUris.length} posts`,
      results,
    };
  } catch (error) {
    console.error("BlueSky: Bulk delete posts error:", error);
    return {
      success: false,
      message: `Failed to delete posts: ${error.message}`,
      errorCode: "bulk_delete_error",
      error: {
        name: error.name,
        message: error.message,
      },
    };
  }
};
