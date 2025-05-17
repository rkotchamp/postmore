import { NextResponse } from "next/server";
import blueSkyService from "@/app/lib/api/services/BlueSky/blueSkyService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import SocialAccount from "@/app/models/SocialAccount";

/**
 * API Route to delete a Bluesky post
 *
 * @param {Request} request - The request object with postUri and accountId
 * @returns {NextResponse} JSON response with the result
 */
export async function POST(request) {
  try {
    // 1. Get server session to verify the user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: You must be logged in" },
        { status: 401 }
      );
    }

    // 2. Parse the request body
    const body = await request.json();
    const { postUri, accountId } = body;

    // 3. Validate required fields
    if (!postUri || !accountId) {
      return NextResponse.json(
        {
          error: "Missing required fields: postUri and accountId are required",
        },
        { status: 400 }
      );
    }

    // 4. Verify the user owns the account
    const account = await SocialAccount.findOne({
      _id: accountId,
      userId: session.user.id,
      platform: "bluesky",
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found or not owned by the current user" },
        { status: 404 }
      );
    }

    // 5. Call the Bluesky service to delete the post
    const result = await blueSkyService.deletePost(accountId, postUri);

    // 6. Return the result
    if (result.success) {
      return NextResponse.json(result);
    } else {
      // Return appropriate status code based on error type
      const statusCode = result.errorCode === "post_not_found" ? 404 : 500;

      return NextResponse.json(
        { error: result.message || "Failed to delete post", details: result },
        { status: statusCode }
      );
    }
  } catch (error) {
    console.error("Error deleting Bluesky post:", error);
    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * API Route to batch delete multiple Bluesky posts
 *
 * @param {Request} request - The request object with postUris and accountId
 * @returns {NextResponse} JSON response with the result
 */
export async function DELETE(request) {
  try {
    // 1. Get server session to verify the user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: You must be logged in" },
        { status: 401 }
      );
    }

    // 2. Parse the request body
    const body = await request.json();
    const { postUris, accountId } = body;

    // 3. Validate required fields
    if (
      !postUris ||
      !Array.isArray(postUris) ||
      postUris.length === 0 ||
      !accountId
    ) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid required fields: postUris array and accountId are required",
        },
        { status: 400 }
      );
    }

    // 4. Verify the user owns the account
    const account = await SocialAccount.findOne({
      _id: accountId,
      userId: session.user.id,
      platform: "bluesky",
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found or not owned by the current user" },
        { status: 404 }
      );
    }

    // 5. Call the Bluesky service to batch delete posts
    const result = await blueSkyService.deletePosts(accountId, postUris);

    // 6. Return the result
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: result.message || "Failed to delete posts", details: result },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error batch deleting Bluesky posts:", error);
    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 }
    );
  }
}
