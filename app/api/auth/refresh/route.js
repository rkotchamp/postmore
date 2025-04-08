import { NextResponse } from "next/server";
import { refreshAccessToken } from "@/app/lib/jwt";

export async function POST(request) {
  try {
    // Get refresh token from cookies
    const refreshToken = request.cookies.get("refresh_token")?.value;

    // If no refresh token, return error
    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: "No refresh token provided" },
        { status: 401 }
      );
    }

    // Try to refresh the token
    const tokens = await refreshAccessToken(refreshToken);

    // If token refresh failed, return error
    if (!tokens) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired refresh token" },
        { status: 401 }
      );
    }

    // Create response with new access token
    const response = NextResponse.json(
      {
        success: true,
        message: "Token refreshed successfully",
        token: tokens.accessToken,
      },
      { status: 200 }
    );

    // Set new refresh token in cookie
    response.cookies.set({
      name: "refresh_token",
      value: tokens.refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Token refresh error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error refreshing token",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
