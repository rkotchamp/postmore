import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToMongoose from "@/app/lib/db/mongoose";
import SocialAccount from "@/app/models/SocialAccount";

export async function DELETE(request, { params }) {
  try {
    // Get the user's session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToMongoose();

    // Find the account first to verify ownership
    const account = await SocialAccount.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found or unauthorized" },
        { status: 404 }
      );
    }

    // Instead of deleting, mark as inactive and clear tokens
    const updateResult = await SocialAccount.updateOne(
      { _id: id },
      {
        $set: {
          status: "inactive",
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null,
          errorMessage: "Disconnected by user",
          updatedAt: new Date(),
        },
      }
    );

    if (!updateResult.modifiedCount) {
      throw new Error("Failed to update account status");
    }

    return NextResponse.json({
      message: "Account disconnected successfully",
    });
  } catch (error) {
    console.error("Error disconnecting social account:", error);
    return NextResponse.json(
      { error: "Failed to disconnect account" },
      { status: 500 }
    );
  }
}
