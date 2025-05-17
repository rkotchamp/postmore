import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  refreshAllBlueskyTokens,
  refreshAccountTokens,
} from "@/app/lib/queues/tokenRefreshQueue";

/**
 * POST handler for triggering token refreshes
 * Can refresh tokens for all accounts or a specific account
 */
export async function POST(request) {
  try {
    // Verify admin user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Get request parameters
    const { accountId } = await request.json();

    // If accountId is provided, refresh tokens for that account only
    if (accountId) {
      console.log(
        `Admin API: Triggering token refresh for account ${accountId}`
      );
      const jobId = await refreshAccountTokens(accountId);

      return NextResponse.json({
        message: `Token refresh job scheduled for account ${accountId}`,
        jobId,
        success: true,
      });
    }

    // Otherwise, refresh tokens for all accounts
    console.log("Admin API: Triggering token refresh for all accounts");
    const jobId = await refreshAllBlueskyTokens();

    return NextResponse.json({
      message: "Token refresh job scheduled for all accounts",
      jobId,
      success: true,
    });
  } catch (error) {
    console.error("Admin API token refresh error:", error);
    return NextResponse.json(
      {
        message: `Server error: ${error.message}`,
        success: false,
      },
      { status: 500 }
    );
  }
}
