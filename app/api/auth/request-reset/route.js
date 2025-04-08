import { NextResponse } from "next/server";
import crypto from "crypto";
import { headers } from "next/headers";
import { connectToMongoose } from "@/app/lib/db/mongoose";
import User from "@/app/models/userSchema";
import PasswordReset from "@/app/models/passwordResetSchema";
import sendPasswordResetEmail from "@/app/lib/mail/sendEmail";
import { rateLimit } from "@/app/lib/utils/rateLimiter";

// Create a limiter: max 5 requests per IP per 30 minutes
const limiter = rateLimit({
  interval: 30 * 60 * 1000, // 30 minutes
  uniqueTokenPerInterval: 500, // Max 500 users per interval
});

export async function POST(request) {
  try {
    console.log("Processing password reset request...");

    // Get IP address from headers (works with proxies and Vercel)
    const headersList = headers();
    const forwarded = headersList.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    console.log("Request from IP:", ip);

    // Apply rate limiting by IP
    try {
      await limiter.check(ip, 5); // Limit to 5 requests per 30 minutes
      console.log("Rate limiting check passed");
    } catch (error) {
      console.log("Rate limiting check failed:", error.message);
      return NextResponse.json(
        { error: "Too many requests, please try again later" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body;

    console.log("Requested email reset for:", email);

    if (!email) {
      console.log("Email is required but was not provided");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Connect to database
    console.log("Connecting to database...");
    await connectToMongoose();
    console.log("Database connection established");

    // Check for too many reset attempts for this email
    console.log("Checking rate limits for email:", email);
    const isRateLimited = await PasswordReset.isRateLimited(email);
    if (isRateLimited) {
      console.log("Email is rate limited:", email);
      // Don't reveal that the email is rate limited
      return NextResponse.json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Generate reset token
    console.log("Generating reset token...");
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    console.log("Original Reset Token:", resetToken);
    console.log("Hashed Reset Token:", resetTokenHash);

    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Check if there's an existing entry in the password-resets collection
    // Only checking if email exists, ignoring all other fields
    let existingResetEntry = await PasswordReset.findOne({ email });

    // If no entry found at all, check user collection
    if (!existingResetEntry) {
      console.log("No entry found in password-resets for email:", email);

      // As a fallback, check if user exists directly
      console.log("Checking user collection as fallback:", email);
      const user = await User.findOne({ email });

      if (user) {
        console.log(
          "User found in users collection, creating entry for password reset:",
          email
        );

        // Create a placeholder entry for this user
        const placeholderToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto
          .createHash("sha256")
          .update(placeholderToken)
          .digest("hex");

        // Create entry with current user info
        existingResetEntry = await PasswordReset.create({
          email,
          name: user.name,
          token: tokenHash,
          expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year future expiry
          used: true,
        });

        console.log("Created new entry from user record:", email);
      }
    }

    if (existingResetEntry) {
      console.log(
        "Found entry for email in password-resets collection:",
        email
      );

      // Delete any existing temporary reset tokens for this user
      await PasswordReset.deleteMany({
        email,
        used: false, // Only delete tokens that haven't been used yet
      });

      // Create new password reset document
      const newPasswordReset = await PasswordReset.create({
        email,
        name: existingResetEntry.name,
        token: resetTokenHash,
        expires: resetTokenExpiry,
        ipAddress: ip,
        userAgent,
        used: false, // This is a fresh reset token
      });

      console.log("Password reset record created, sending email...");

      // Send the password reset email
      try {
        const emailResult = await sendPasswordResetEmail({
          email,
          resetToken,
          name: existingResetEntry.name,
        });

        console.log("Email sending result:", emailResult);

        if (!emailResult.success) {
          console.error(
            "Failed to send password reset email:",
            emailResult.error
          );
        }
      } catch (emailError) {
        console.error("Exception sending password reset email:", emailError);
      }
    } else {
      console.log(
        "No password reset entry found for this email, NOT sending email:",
        email
      );
      // Simulate work to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Return success whether user exists or not (prevents email enumeration)
    return NextResponse.json({
      success: true,
      message:
        "If your email is registered, you'll receive a reset link shortly.",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}
