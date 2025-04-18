import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToMongoose from "@/app/lib/db/mongoose";
import SocialAccount from "@/app/models/SocialAccount";

/**
 * GET endpoint to fetch a user's social accounts
 * Optionally filtered by platform
 */
export async function GET(request) {
  console.log("========== Social Accounts API Called ==========");

  try {
    // Get the user's session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToMongoose();

    // Fetch all social accounts for the user
    const accounts = await SocialAccount.find({
      userId: session.user.id,
      status: "active", // Only get active accounts
    }).sort({ createdAt: -1 }); // Sort by newest first

    // Log the results
    console.log("Found accounts:", {
      count: accounts.length,
      platforms: accounts.map((acc) => acc.platform),
      ids: accounts.map((acc) => acc._id.toString()),
    });

    console.log(
      "========== Social Accounts API Completed Successfully =========="
    );

    // Return the accounts
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("========== Social Accounts API Failed ==========");
    console.error("Error fetching social accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch social accounts" },
      { status: 500 }
    );
  }
}
