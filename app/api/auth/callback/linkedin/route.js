import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToMongoose } from "@/app/lib/db/mongoose";
import SocialAccount from "@/app/models/SocialAccount";
import User from "@/app/models/userSchema";

const clientId = process.env.LINKEDIN_CLIENT_ID;
const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

/**
 * Exchanges LinkedIn authorization code for access token.
 */
async function getLinkedInAccessToken(code) {
  const tokenUrl = "https://www.linkedin.com/oauth/v2/accessToken";
  
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error("Failed to get LinkedIn access token:", data);
    throw new Error(
      data.error_description || data.error || "Failed to get access token"
    );
  }

  return data;
}

/**
 * Fetches LinkedIn user profile information.
 */
async function getLinkedInProfile(accessToken) {
  const profileUrl = "https://api.linkedin.com/v2/userinfo";
  
  const response = await fetch(profileUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to get LinkedIn profile:", data);
    throw new Error(
      data.error_description || data.error || "Failed to get profile"
    );
  }

  return data;
}

/**
 * GET handler for LinkedIn OAuth callback.
 */
export async function GET(request) {
  const redirectWithError = (message, details = null) => {
    console.error("LinkedIn Error:", { message, details });
    const params = new URLSearchParams({
      platform: "linkedin",
      error: message,
    });
    if (details) {
      params.append("debug", JSON.stringify(details));
    }
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/authenticate?${params}`
    );
  };

  try {
    // 1. Get authorization code from URL
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const state = searchParams.get("state");

    console.log("LinkedIn Callback: Received callback with params:", {
      code: code ? "present" : "missing",
      error,
      errorDescription,
      state: state ? "present" : "missing",
    });

    if (error || !code) {
      return redirectWithError(errorDescription || error || "No authorization code received", {
        error,
        errorDescription,
      });
    }

    // 2. Exchange code for access token
    const tokenData = await getLinkedInAccessToken(code);
    console.log("LinkedIn Callback: Successfully obtained access token");

    // 3. Get user profile
    const profile = await getLinkedInProfile(tokenData.access_token);
    console.log("LinkedIn Callback: Successfully obtained profile");

    // 4. Get user from session
    const cookieStore = cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
      return redirectWithError("User not authenticated");
    }

    await connectToMongoose();
    const user = await User.findOne({ session });

    if (!user) {
      return redirectWithError("User not found");
    }

    // 5. Save LinkedIn account
    const accountData = {
      userId: user._id,
      platform: "linkedin",
      platformAccountId: profile.sub, // LinkedIn user ID
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      tokenExpiresAt: tokenData.expires_in ? 
        new Date(Date.now() + tokenData.expires_in * 1000) : null,
      profileImage: profile.picture || null,
      platformUsername: profile.email,
      displayName: profile.name,
      status: "active",
      lastRefreshed: new Date(),
      scope: tokenData.scope,
    };

    console.log("LinkedIn Callback: Upserting account:", {
      userId: user._id,
      platformAccountId: profile.sub,
      displayName: profile.name,
      email: profile.email,
    });

    const result = await SocialAccount.findOneAndUpdate(
      {
        userId: user._id,
        platform: "linkedin",
        platformAccountId: profile.sub,
      },
      accountData,
      { upsert: true, new: true }
    );

    console.log("LinkedIn Callback: Successfully saved account");

    // 6. Redirect to success page
    const successParams = new URLSearchParams({
      platform: "linkedin",
      success: "true",
      username: profile.name,
    });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/authenticate?${successParams}`
    );
  } catch (error) {
    console.error("LinkedIn Callback Error:", error);
    return redirectWithError(error.message || "An unexpected error occurred", {
      stack: error.stack,
    });
  }
}