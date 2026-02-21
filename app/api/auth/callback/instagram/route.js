import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToMongoose } from "@/app/lib/db/mongoose";
import SocialAccount from "@/app/models/SocialAccount";
import User from "@/app/models/userSchema";

const clientId = process.env.META_APP_ID;
const clientSecret = process.env.META_APP_SECRET;
const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

/**
 * Exchange the short-lived code for a short-lived access token.
 * Uses Instagram's own token endpoint (not Facebook Graph API).
 * Must be sent as application/x-www-form-urlencoded POST body.
 */
async function getShortLivedToken(code) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error("Short-lived token exchange failed:", data);
    throw new Error(data.error_message || data.error?.message || "Failed to exchange code for token");
  }

  // Returns { access_token, token_type, user_id }
  return data;
}

/**
 * Exchange the short-lived token for a long-lived token (60 days).
 * Uses graph.instagram.com — NOT graph.facebook.com.
 */
async function getLongLivedToken(shortLivedToken) {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: clientSecret,
    access_token: shortLivedToken,
  });

  const response = await fetch(
    `https://graph.instagram.com/access_token?${params.toString()}`
  );
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error("Long-lived token exchange failed:", data);
    throw new Error(data.error?.message || "Failed to get long-lived token");
  }

  // Returns { access_token, token_type, expires_in }
  return data;
}

/**
 * Fetch the Instagram Business account profile using the long-lived token.
 * Uses graph.instagram.com/me — no Facebook Pages lookup required.
 */
async function getInstagramProfile(accessToken) {
  const fields = "id,username,name,profile_picture_url,followers_count,media_count,account_type";
  const params = new URLSearchParams({ fields, access_token: accessToken });

  const response = await fetch(`https://graph.instagram.com/me?${params.toString()}`);
  const data = await response.json();

  if (!response.ok || !data.id) {
    console.error("Failed to fetch Instagram profile:", data);
    throw new Error(data.error?.message || "Failed to fetch Instagram profile");
  }

  return data;
}

/**
 * GET /api/auth/callback/instagram
 *
 * Handles the Instagram Business Login OAuth callback.
 * New flow (July 2024+): direct Instagram login — no Facebook Pages required.
 *
 * Steps:
 *  1. Receive authorization code
 *  2. Exchange code → short-lived token (api.instagram.com)
 *  3. Exchange short-lived → long-lived token (graph.instagram.com)
 *  4. Fetch user profile (graph.instagram.com/me)
 *  5. Save/upsert SocialAccount in MongoDB
 *  6. Redirect to /authenticate with success params
 */
export async function GET(request) {
  const redirectWithError = (message, details = null) => {
    console.error("Instagram OAuth Error:", message, details);
    const params = new URLSearchParams({ platform: "instagram", error: message });
    if (details) params.append("debug", JSON.stringify(details));
    return NextResponse.redirect(`${appUrl}/authenticate?${params}`);
  };

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorReason = searchParams.get("error_reason");

    console.log("Instagram callback received:", {
      code: code ? `present (length: ${code.length})` : "missing",
      error,
      errorReason,
    });

    if (error || !code) {
      return redirectWithError(error || "No authorization code received", { errorReason });
    }

    // Step 1: Short-lived token
    console.log("Exchanging code for short-lived token...");
    const shortTokenData = await getShortLivedToken(code);
    console.log("Short-lived token obtained. Instagram user_id:", shortTokenData.user_id);

    // Step 2: Long-lived token (60 days)
    console.log("Exchanging short-lived token for long-lived token...");
    const longTokenData = await getLongLivedToken(shortTokenData.access_token);
    console.log("Long-lived token obtained. Expires in:", longTokenData.expires_in, "seconds");

    const accessToken = longTokenData.access_token;
    const expiresIn = longTokenData.expires_in || 60 * 24 * 60 * 60; // default 60 days

    // Step 3: Fetch Instagram profile
    console.log("Fetching Instagram Business profile...");
    const profile = await getInstagramProfile(accessToken);
    console.log("Instagram profile fetched:", {
      id: profile.id,
      username: profile.username,
      account_type: profile.account_type,
    });

    // Step 4: Get authenticated user from session cookie
    const cookieStore = cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
      return redirectWithError("User not authenticated - please log in to Postmore first");
    }

    await connectToMongoose();
    const user = await User.findOne({ session });

    if (!user) {
      return redirectWithError("User not found");
    }

    // Step 5: Upsert SocialAccount
    const accountData = {
      userId: user._id,
      platform: "instagram",
      platformAccountId: profile.id,
      accessToken,
      platformUsername: profile.username,
      displayName: profile.name || profile.username,
      profileImage: profile.profile_picture_url,
      status: "active",
      tokenExpiry: new Date(Date.now() + expiresIn * 1000),
      metadata: {
        accountType: profile.account_type,
        followersCount: profile.followers_count,
        mediaCount: profile.media_count,
      },
    };

    await SocialAccount.findOneAndUpdate(
      { userId: user._id, platform: "instagram", platformAccountId: profile.id },
      accountData,
      { upsert: true, new: true }
    );

    console.log("Instagram account saved successfully:", {
      userId: user._id,
      platformAccountId: profile.id,
      username: profile.username,
    });

    // Step 6: Redirect to success
    const successParams = new URLSearchParams({
      platform: "instagram",
      success: "true",
      username: profile.username,
    });
    return NextResponse.redirect(`${appUrl}/authenticate?${successParams}`);

  } catch (error) {
    console.error("Instagram Callback Error:", error);
    return redirectWithError(error.message || "An unexpected error occurred");
  }
}
