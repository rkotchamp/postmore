import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToMongoose from "@/app/lib/db/mongoose";
import blueSkyService from "@/app/lib/api/services/BlueSky/blueSkyService";

/**
 * POST handler for refreshing Bluesky tokens
 * Receives accountId to refresh tokens for a specific account
 */
export async function POST(request) {
  try {
    console.log("Bluesky token refresh API: Starting refresh process");

    // 1. Verify user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log("Bluesky token refresh API: Authentication required");
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Get account ID from request body
    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      console.log("Bluesky token refresh API: Account ID is required");
      return NextResponse.json(
        { message: "Account ID is required" },
        { status: 400 }
      );
    }

    console.log(
      `Bluesky token refresh API: Processing refresh for account ${accountId}`
    );

    // 3. Connect to database
    await connectToMongoose();

    // 4. Force refresh the token using the service
    console.log(
      "Bluesky token refresh API: Calling blueSkyService.forceRefreshTokens"
    );
    const refreshResult = await blueSkyService.forceRefreshTokens(accountId);

    console.log("Bluesky token refresh API: Refresh result", refreshResult);

    if (!refreshResult.success) {
      return NextResponse.json(
        {
          message: refreshResult.message,
          error: refreshResult.error,
          status: "error",
          errorCode: refreshResult.errorCode,
        },
        { status: 400 }
      );
    }

    // 5. Return success
    return NextResponse.json({
      message: "Bluesky tokens refreshed successfully",
      status: "active",
    });
  } catch (error) {
    console.error("Bluesky token refresh error:", error);
    return NextResponse.json(
      {
        message: `Server error: ${error.message}`,
        error: {
          name: error.name,
          message: error.message,
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
      },
      { status: 500 }
    );
  }
}
