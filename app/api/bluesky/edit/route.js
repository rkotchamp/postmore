import { NextResponse } from "next/server";
import blueSkyService from "@/app/lib/api/services/BlueSky/blueSkyService";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import SocialAccount from "@/app/models/SocialAccount";

/**
 * API Route to edit a Bluesky post
 *
 * @param {Request} request - The request object with postUri, accountId, and text
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
    const { postUri, accountId, text, keepMedia = true } = body;

    // 3. Validate required fields
    if (!postUri || !accountId) {
      return NextResponse.json(
        {
          error: "Missing required fields: postUri and accountId are required",
        },
        { status: 400 }
      );
    }

    if (!text || text.trim() === "") {
      return NextResponse.json(
        { error: "Missing required field: text cannot be empty" },
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

    // 5. Call the Bluesky service to edit the post
    const result = await blueSkyService.editPost(
      accountId,
      postUri,
      text,
      keepMedia
    );

    // 6. Return the result
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { error: result.message || "Failed to edit post", details: result },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error editing Bluesky post:", error);
    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 }
    );
  }
}
