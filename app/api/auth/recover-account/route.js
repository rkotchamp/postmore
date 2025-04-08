import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/db/mongodb";
import { connectToMongoose } from "@/app/lib/db/mongoose";
import User from "@/app/models/userSchema";
import {
  validateForm,
  recoverAccountSchema,
} from "@/app/models/ZodFormSchemas";
import crypto from "crypto";

// For future implementation: send actual email with reset link
const sendResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/recover-account/reset-password?code=${resetToken}&email=${email}`;

  // In a real app, you would use a service like Nodemailer, SendGrid, etc. to send the email
  console.log("SENDING RESET EMAIL TO:", email);
  console.log("RESET URL:", resetUrl);

  // For now, just return success
  return true;
};

export async function POST(request) {
  try {
    // Parse the request body
    const body = await request.json();

    // Validate email using the schema
    const validation = validateForm(recoverAccountSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: validation.error,
        },
        { status: 400 }
      );
    }

    const { email } = body;

    // Connect to MongoDB using our centralized functions
    await connectToMongoose();
    await connectToDatabase();

    // Find user with the provided email
    const user = await User.findOne({ email });

    // Always return success even if user not found (for security)
    // This prevents email enumeration attacks
    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message:
            "If your email is registered, you will receive a password reset link shortly",
        },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set expire time (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    // Save the updated user
    await user.save();

    // Send password reset email
    await sendResetEmail(email, resetToken);

    return NextResponse.json(
      {
        success: true,
        message:
          "If your email is registered, you will receive a password reset link shortly",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset request error:", error);

    // For security, still return a generic success message
    return NextResponse.json(
      {
        success: true,
        message:
          "If your email is registered, you will receive a password reset link shortly",
      },
      { status: 200 }
    );
  }
}
