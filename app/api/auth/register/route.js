import { NextResponse } from "next/server";
import { connectToMongoose } from "@/app/lib/db/mongoose";
import User from "@/app/models/userSchema";
import PasswordReset from "@/app/models/passwordResetSchema";
import { validateForm, registerSchema } from "@/app/models/ZodFormSchemas";
import { generateAuthTokens } from "@/app/lib/jwt";
import crypto from "crypto";

export async function POST(request) {
  try {
    // Parse the request body
    const body = await request.json();

    // Validate input using Zod schema
    const validation = validateForm(registerSchema, body);

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

    // Destructure validated data
    const { fullName, email, password } = validation.data;

    // Check for checkout session data (for post-payment signup)
    const { checkoutSession, acquisitionSource } = body;

    // Connect to MongoDB using mongoose
    await connectToMongoose();

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 409 }
      );
    }

    // Prepare user data
    const userData = {
      name: fullName,
      email,
      password, // Pass as "password" to trigger pre-save hook in userSchema
      authProvider: "email",
      image: "",
      // Add acquisition tracking
      acquisition: {
        source: acquisitionSource || "direct",
        signupDate: new Date(),
      },
    };

    // If there's checkout session data, add subscription info
    if (checkoutSession && checkoutSession.planId) {
      console.log(`Creating user with subscription plan: ${checkoutSession.planId}`);

      userData.subscription = {
        // Note: We don't have the actual Stripe subscription ID yet
        // This will be added later when we activate the subscription
        planId: checkoutSession.planId,
        status: "incomplete", // Will be updated to "active" after activation
      };

      // Also update settings for compatibility
      userData.settings = {
        plan: checkoutSession.planId,
        subscriptionStatus: "incomplete",
      };

      // Track the initial plan in acquisition data
      userData.acquisition.initialPlan = checkoutSession.planId;
    }

    // Create a new user
    const newUser = new User(userData);

    // Save the user to the database
    // The password will be automatically hashed by the pre-save hook in userSchema.js
    await newUser.save();

    // Also create an initial placeholder entry in the password-resets collection
    // This is to prevent email enumeration during password reset requests
    try {
      console.log(`Creating placeholder password reset entry for: ${email}`);

      // Generate a placeholder token (not for actual use)
      const placeholderToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(placeholderToken)
        .digest("hex");

      // Set expiry to a future date (1 year) since we're just using this as a placeholder
      // A long expiry prevents the entry from being deleted
      const expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year in the future

      // Create the entry in password-resets collection
      const passwordResetEntry = await PasswordReset.create({
        email,
        name: fullName, // Store the user's name to avoid User collection lookups during reset
        token: tokenHash,
        expires: expiry,
        used: true, // Mark as used so it won't be deleted and can't be used for actual resets
      });

      console.log(
        `Created placeholder password reset entry for ${email}, ID: ${passwordResetEntry._id}`
      );
    } catch (resetError) {
      // Don't fail registration if this fails, just log the error
      console.error(
        `Error creating placeholder password reset entry for ${email}:`,
        resetError
      );
    }

    // Generate JWT tokens for authentication
    const { accessToken, refreshToken } = generateAuthTokens(newUser);

    // Remove password from response
    const userResponse = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      authProvider: newUser.authProvider,
      createdAt: newUser.createdAt,
      image: newUser.image,
    };

    // Set the refresh token as an HTTP-only cookie
    const response = NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        user: userResponse,
        token: accessToken, // Include access token in the response body
      },
      { status: 201 }
    );

    // Set cookie for refresh token (HTTP-only for security)
    response.cookies.set({
      name: "refresh_token",
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Secure in production
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);

    // Handle duplicate key errors from MongoDB
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Error registering user",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
