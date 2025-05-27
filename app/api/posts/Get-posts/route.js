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

    // Fetch posts for the logged-in user
    const posts = await db
      .collection("posts")
      .find({ userId: session.user.id })
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
 