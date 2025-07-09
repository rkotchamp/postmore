import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { triggerYouTubePolling } from "@/app/lib/queues/youtubePollingQueue.mjs";

/**
 * POST handler for manually triggering YouTube polling
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

    console.log("Admin API: Triggering manual YouTube polling");
    const jobId = await triggerYouTubePolling();

    return NextResponse.json({
      message: "YouTube polling job triggered successfully",
      jobId,
      success: true,
    });
  } catch (error) {
    console.error("Admin API YouTube polling error:", error);
    return NextResponse.json(
      {
        message: `Server error: ${error.message}`,
        success: false,
      },
      { status: 500 }
    );
  }
}
