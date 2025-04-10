import { NextResponse } from "next/server";
import apiManager from "@/app/lib/api/services/apiManager";
import { connectToMongoose } from "@/app/lib/db/mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * Handler for POST requests to submit a post
 * This endpoint accepts post data and handles immediate posting or scheduling
 */
export async function POST(request) {
  try {
    // Get the session to verify the user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const data = await request.json();
    const {
      selectedAccounts,
      textContent,
      mediaFiles,
      scheduleType,
      scheduledAt,
      title,
      additionalParams = {}, // Platform-specific parameters
    } = data;

    // Validate the request
    if (!selectedAccounts || selectedAccounts.length === 0) {
      return NextResponse.json(
        { error: "At least one account must be selected" },
        { status: 400 }
      );
    }

    if (!textContent && (!mediaFiles || mediaFiles.length === 0)) {
      return NextResponse.json(
        { error: "Post must contain text content or media files" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToMongoose();

    // Prepare the post data
    const postData = {
      textContent,
      mediaFiles,
      title,
      userId: session.user.id,
      ...additionalParams,
    };

    // Process each selected account
    const targets = selectedAccounts.map((account) => ({
      platform: account.platform,
      account,
    }));

    let results;

    // Handle immediate vs. scheduled posting
    if (scheduleType === "immediate") {
      // Post immediately
      results = await apiManager.postToMultiplePlatforms(targets, postData);
    } else if (scheduleType === "scheduled" && scheduledAt) {
      // Schedule the post
      results = await Promise.all(
        targets.map(({ platform, account }) =>
          apiManager.schedulePost(
            platform,
            account,
            postData,
            new Date(scheduledAt)
          )
        )
      );
    } else {
      return NextResponse.json(
        { error: "Invalid schedule type or missing scheduled time" },
        { status: 400 }
      );
    }

    // Return the results
    return NextResponse.json({
      success: true,
      message:
        scheduleType === "immediate"
          ? "Post published successfully"
          : "Post scheduled successfully",
      results,
    });
  } catch (error) {
    console.error("Error submitting post:", error);
    return NextResponse.json(
      { error: "Failed to submit post", message: error.message },
      { status: 500 }
    );
  }
}
