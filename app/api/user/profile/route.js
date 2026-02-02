import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import User from "@/app/models/userSchema";
import { connectToMongoose } from "@/app/lib/db/mongoose";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToMongoose();

    // Find user by email (works for both OAuth and manual users)
    const user = await User.findOne({ email: session.user.email }).select(
      "name email image authProvider createdAt settings subscription stripeCustomerId isAdmin"
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return user data
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
        settings: user.settings || {
          theme: "system",
          scheduledPostsView: "grid",
        },
        subscription: user.subscription || null,
        stripeCustomerId: user.stripeCustomerId || null,
        isAdmin: user.isAdmin || false,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectToMongoose();

    // Find user by email (include password for verification if needed)
    const user = await User.findOne({ email: session.user.email }).select(
      "+password"
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse request body
    const { name, image, currentPassword, newPassword, settings } =
      await request.json();

    // Prepare update object
    const updateData = {};

    // Handle name update
    if (name && name.trim() !== user.name) {
      updateData.name = name.trim();
    }

    // Handle image update
    if (image && image !== user.image) {
      updateData.image = image;
    }

    // Handle settings update
    if (settings) {
      const updatedSettings = { ...user.settings };

      // Validate theme setting
      if (
        settings.theme &&
        ["light", "dark", "system"].includes(settings.theme)
      ) {
        updatedSettings.theme = settings.theme;
      }

      // Validate scheduledPostsView setting
      if (
        settings.scheduledPostsView &&
        ["grid", "grouped"].includes(settings.scheduledPostsView)
      ) {
        updatedSettings.scheduledPostsView = settings.scheduledPostsView;
      }

      updateData.settings = updatedSettings;
    }

    // Handle password update
    if (currentPassword && newPassword) {
      // Check if user has a password (not OAuth user)
      if (!user.password) {
        return NextResponse.json(
          { error: "Cannot change password for OAuth accounts" },
          { status: 400 }
        );
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);
      updateData.password = hashedNewPassword;
    }

    // Update user if there are changes
    if (Object.keys(updateData).length > 0) {
      await User.findOneAndUpdate({ email: session.user.email }, updateData, {
        new: true,
      });
    }

    // Return updated user data
    const updatedUser = await User.findOne({
      email: session.user.email,
    }).select("name email image authProvider createdAt settings subscription stripeCustomerId");

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image,
        authProvider: updatedUser.authProvider,
        createdAt: updatedUser.createdAt,
        settings: updatedUser.settings || {
          theme: "system",
          scheduledPostsView: "grid",
        },
        subscription: updatedUser.subscription || null,
        stripeCustomerId: updatedUser.stripeCustomerId || null,
      },
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
