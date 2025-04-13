import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * Simplified TikTok OAuth callback handler - debug version
 * Only exchanges code for token and returns the raw response
 */
export async function GET(request) {
  try {
    // Get the code from TikTok callback
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    console.log("TikTok callback received:", {
      code: code ? `${code.substring(0, 10)}...` : "MISSING",
      state: state ? `${state.substring(0, 10)}...` : "MISSING",
      allParams: Object.fromEntries(searchParams.entries()),
    });

    if (!code) {
      return NextResponse.redirect(
        `${
          process.env.NEXT_PUBLIC_APP_URL
        }/authenticate?platform=tiktok&error=true&message=${encodeURIComponent(
          "No authorization code provided"
        )}`
      );
    }

    // Get the current user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(
        `${
          process.env.NEXT_PUBLIC_APP_URL
        }/authenticate?platform=tiktok&error=true&message=${encodeURIComponent(
          "Not authenticated"
        )}`
      );
    }

    try {
      // Validate redirect URI
      const redirectUri = process.env.TIKTOK_REDIRECT_URI;
      if (!redirectUri) {
        throw new Error("Missing TikTok redirect URI configuration");
      }

      // Set up token request parameters
      const tokenParams = {
        client_key: process.env.TIKTOK_CLIENT_ID,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      };

      console.log("Token request parameters:", {
        client_key: tokenParams.client_key ? "PRESENT" : "MISSING",
        client_secret: tokenParams.client_secret ? "PRESENT" : "MISSING",
        code: tokenParams.code ? "PRESENT" : "MISSING",
        grant_type: tokenParams.grant_type,
        redirect_uri: tokenParams.redirect_uri,
      });

      // Use the token exchange endpoint
      const tokenUrl = "https://open.tiktokapis.com/v2/oauth/token/";
      console.log("Requesting token from:", tokenUrl);

      // Make the token request
      const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cache-Control": "no-cache",
        },
        body: new URLSearchParams(tokenParams),
      });

      const tokenResponseText = await tokenResponse.text();
      console.log("Raw token response:", tokenResponseText);

      try {
        // Try to parse as JSON to format it nicely in the logs
        const tokenData = JSON.parse(tokenResponseText);
        console.log("Parsed token data:", JSON.stringify(tokenData, null, 2));

        // For this debug version, we'll send the user back with the response data encoded in the URL
        // In production, you'd never expose tokens like this
        const responseInfo = encodeURIComponent(
          `Response Status: ${tokenResponse.status} - ${
            tokenData.error || "Success"
          }`
        );

        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/authenticate?platform=tiktok&success=true&debug=true&response=${responseInfo}`
        );
      } catch (e) {
        console.error("Failed to parse token response:", e);
        return NextResponse.redirect(
          `${
            process.env.NEXT_PUBLIC_APP_URL
          }/authenticate?platform=tiktok&error=true&message=${encodeURIComponent(
            `Invalid token response format: ${tokenResponseText.substring(
              0,
              100
            )}...`
          )}`
        );
      }
    } catch (error) {
      console.error("TikTok token exchange error:", error);
      return NextResponse.redirect(
        `${
          process.env.NEXT_PUBLIC_APP_URL
        }/authenticate?platform=tiktok&error=true&message=${encodeURIComponent(
          error.message || "Token exchange error"
        )}`
      );
    }
  } catch (error) {
    console.error("TikTok callback general error:", error);
    return NextResponse.redirect(
      `${
        process.env.NEXT_PUBLIC_APP_URL
      }/authenticate?platform=tiktok&error=true&message=${encodeURIComponent(
        error.message || "Unknown error"
      )}`
    );
  }
}
