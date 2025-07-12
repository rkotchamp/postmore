import { NextResponse } from "next/server";
import { connectToMongoose } from "@/app/lib/db/mongoose";
import User from "@/app/models/userSchema";
import { validateForm, loginSchema } from "@/app/models/ZodFormSchemas";
import { generateAuthTokens } from "@/app/lib/jwt";

export async function POST(request) {
  try {
    // Parse the request body
    const body = await request.json();

    // Validate input using Zod schema
    const validation = validateForm(loginSchema, body);

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
    const { email, password, rememberMe } = validation.data;

    // Connect to MongoDB using mongoose
    await connectToMongoose();

    // Find user by email and explicitly select the password field
    const user = await User.findOne({ email }).select("+password");

    // Check if user exists
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateAuthTokens(user);

    // Create sanitized user object for response
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      authProvider: user.authProvider,
    };

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: userResponse,
        token: accessToken,
      },
      { status: 200 }
    );

    // Set cookie expiration based on "remember me" option
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 1 day in seconds

    // Set refresh token as HTTP-only cookie
    response.cookies.set({
      name: "refresh_token",
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: maxAge,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { success: false, message: "Error during login", error: error.message },
      { status: 500 }
    );
  }
}
