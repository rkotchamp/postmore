import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { connectToMongoose } from "@/app/lib/db/mongoose";
import User from "@/app/models/userSchema";
import PasswordReset from "@/app/models/passwordResetSchema";
import { rateLimit } from "@/app/lib/utils/rateLimiter";

// Create a stricter limiter for actual password resets: max 3 requests per IP per hour
const limiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500, // Max 500 users per interval
});

export async function POST(request) {
  try {
    // Get IP address from headers
    const headersList = headers();
    const forwarded = headersList.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Apply rate limiting by IP
    try {
      await limiter.check(ip, 3); // Limit to 3 attempts per hour
    } catch (error) {
      return NextResponse.json(
        { error: "Too many attempts, please try again later" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { password, code, email } = body;

    // Validate request
    if (!password || !code || !email) {
      return NextResponse.json(
        { error: "Password, reset code, and email are required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToMongoose();

    // Hash the provided reset token to compare with stored hash
    console.log("Received reset code:", code);
    const hashedToken = crypto.createHash("sha256").update(code).digest("hex");
    console.log("Hashed received token:", hashedToken);

    // Find valid password reset document
    const passwordReset = await PasswordReset.findOne({
      email,
      token: hashedToken,
      expires: { $gt: Date.now() },
      used: false,
    });

    console.log(
      "Password reset lookup result:",
      passwordReset ? "Found" : "Not found"
    );

    if (passwordReset) {
      console.log("Token matches:", passwordReset.token === hashedToken);
      console.log("Token expired:", passwordReset.expires < Date.now());
      console.log("Token used:", passwordReset.used);
    } else {
      // Let's look for any matching token to debug
      const anyMatch = await PasswordReset.findOne({ email });
      if (anyMatch) {
        console.log("Found entry for this email but token/status didn't match");
        console.log("Expected token:", anyMatch.token);
        console.log("Token used status:", anyMatch.used);
        console.log("Token expired status:", anyMatch.expires < Date.now());
      } else {
        console.log("No entries found for email:", email);
      }
    }

    if (!passwordReset) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Track this attempt
    passwordReset.attempts += 1;
    passwordReset.ipAddress = ip;
    passwordReset.userAgent = userAgent;
    await passwordReset.save();

    // Check for too many attempts on this specific token
    if (passwordReset.attempts >= 5) {
      // Mark the token as used so it can't be tried again
      passwordReset.used = true;
      await passwordReset.save();

      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new reset link." },
        { status: 400 }
      );
    }

    // Update user password
    // Now, find the user (only after we've verified the reset token)
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal that the email doesn't exist, but mark the attempt
      passwordReset.used = true;
      await passwordReset.save();

      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Set the password directly and let the pre-save hook handle the hashing
    user.password = password;
    await user.save();

    // Mark the reset token as used
    passwordReset.used = true;
    await passwordReset.save();

    // Log successful password change
    console.log(`Password changed successfully for ${email} from IP ${ip}`);

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
