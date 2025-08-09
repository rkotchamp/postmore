import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/app/lib/db/mongodb";

export async function GET(request) {
  try {
    // Get user session to identify the current user
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized - You must be logged in to access your posts" },
        { status: 401 }
      );
    }

    // Connect to the database - the function returns the db directly
    const db = await connectToDatabase();

    // Check for status filter in query parameters
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const excludeScheduled = searchParams.get("excludeScheduled");

    // Build query based on filters
    let query = { userId: session.user.id };

    if (statusFilter === "scheduled") {
      query.status = "scheduled";
      query["schedule.type"] = "scheduled";
    } else if (excludeScheduled === "true") {
      // Exclude scheduled and pending posts - get only published and failed statuses
      query.status = { $nin: ["scheduled", "pending"] };
    }

    // Fetch posts for the logged-in user
    const posts = await db
      .collection("posts")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Return the posts
    return NextResponse.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts", details: error.message },
      { status: 500 }
    );
  }
}
