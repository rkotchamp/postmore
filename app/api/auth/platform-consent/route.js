import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToMongoose } from "@/app/lib/db/mongoose";
import User from "@/app/models/userSchema";

export async function POST(request) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { platform } = await request.json();

    if (!platform) {
      return NextResponse.json(
        { error: "Platform is required" },
        { status: 400 }
      );
    }

    // Valid platforms
    const validPlatforms = [
      "instagram",
      "facebook",
      "twitter",
      "threads",
      "ytShorts",
      "tiktok",
      "bluesky",
    ];

    if (!validPlatforms.includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    // Connect to database
    await connectToMongoose();

    // Update user's platform consent acknowledgment
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          [`platformConsentAcknowledged.${platform}`]: true,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Platform consent acknowledged for ${platform}`,
    });
  } catch (error) {
    console.error("Error updating platform consent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectToMongoose();

    // Get user's platform consent acknowledgments
    const user = await User.findById(session.user.id).select(
      "platformConsentAcknowledged"
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      platformConsentAcknowledged: user.platformConsentAcknowledged || {},
    });
  } catch (error) {
    console.error("Error fetching platform consent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
