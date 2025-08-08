import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToMongoose from "@/app/lib/db/mongoose";
import SocialAccount from "@/app/models/SocialAccount";

// Initialize Google OAuth2 Client (ensure env variables are set)
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.YOUTUBE_REDIRECT_URI; // Use the specific YouTube redirect URI

/**
 * GET handler for Google OAuth callback (specifically for YouTube connection).
 * Exchanges the authorization code for tokens, fetches user info,
 * and stores/updates the YouTube connection in the database.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  // TODO: Add state validation if you implemented state parameter for CSRF
  // const state = searchParams.get("state");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "/"; // Base URL to redirect back to
  const authenticatePage = `${appUrl}/authenticate`;

  console.log("YouTube Callback Received:", { code, error });

  // Redirect helper for errors
  const redirectWithError = (message) => {
    console.error(`YouTube Auth Callback Error: ${message}`);
    return NextResponse.redirect(
      `${authenticatePage}?platform=ytShorts&error=true&message=${encodeURIComponent(
        message
      )}`
    );
  };

  if (error) {
    return redirectWithError(`Google returned an error: ${error}`);
  }

  if (!code) {
    return redirectWithError("No authorization code provided by Google.");
  }

  // Check if OAuth client details are configured
  if (!clientId || !clientSecret || !redirectUri) {
    console.error(
      "YouTube Callback Error: Missing Google OAuth environment variables (ID, SECRET, or YOUTUBE_REDIRECT_URI)."
    );
    return redirectWithError(
      "Server configuration error: YouTube connection is not properly configured."
    );
  }

  try {
    // 1. Get User Session from your app
    console.log("YouTube Callback: Attempting to get server session...");
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error(
        "YouTube Callback Error: User session not found or invalid."
      );
      return redirectWithError(
        "Authentication required. Please log in to connect YouTube."
      );
    }
    const userId = session.user.id;
    console.log("YouTube Callback: User ID from session:", userId);

    // 2. Exchange Authorization Code for Tokens
    const oAuth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
    console.log("YouTube Callback: Exchanging code for tokens...");
    const { tokens } = await oAuth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      // Note: Refresh token might only be sent on first authorization/consent
      console.error(
        "YouTube Callback Error: Missing access_token or refresh_token from Google.",
        tokens
      );
      // Provide a more specific message if refresh token is missing after first attempt
      return redirectWithError(
        "Failed to retrieve necessary tokens from Google. Ensure offline access was requested and granted. You might need to disconnect and reconnect the account."
      );
    }
    console.log("YouTube Callback: Tokens received (refresh token present).", {
      expiry_date: tokens.expiry_date,
    });
    oAuth2Client.setCredentials(tokens);

    // 3. Get Google User Info
    // Using the UserInfo endpoint is often simpler than decoding the ID token manually
    console.log("YouTube Callback: Fetching Google user info...");
    const userInfoResponse = await oAuth2Client.request({
      url: "https://www.googleapis.com/oauth2/v3/userinfo",
    });
    const userInfo = userInfoResponse.data;

    if (!userInfo || !userInfo.sub) {
      console.error(
        "YouTube Callback Error: Failed to fetch user info from Google or missing 'sub' (Google User ID)."
      );
      return redirectWithError(
        "Failed to verify user information with Google."
      );
    }

    const googleUserId = userInfo.sub; // Google's unique user ID
    const profileImage = userInfo.picture || session.user.image; // Use Google picture, fallback to session image

    // 4. Get YouTube Channel Information using the readonly scope
    console.log("YouTube Callback: Fetching YouTube channel info...");
    let displayName = userInfo.name || session.user.name || "YouTube User"; // Fallback to Google name
    
    try {
      const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });
      
      // Get the user's YouTube channels
      const channelsResponse = await youtube.channels.list({
        part: 'snippet',
        mine: true
      });

      if (channelsResponse.data.items && channelsResponse.data.items.length > 0) {
        // Use the first channel's title as the display name
        const channel = channelsResponse.data.items[0];
        displayName = channel.snippet.title;
        console.log("YouTube Callback: Channel name fetched:", displayName);
      } else {
        console.warn("YouTube Callback: No channels found for user, using Google account name");
      }
    } catch (channelError) {
      console.warn("YouTube Callback: Failed to fetch channel info, using Google account name:", channelError.message);
      // Continue with Google account name as fallback
    }

    console.log("YouTube Callback: User Info Fetched:", {
      googleUserId,
      displayName,
    });

    // 5. Connect to Database
    await connectToMongoose();

    // 6. Prepare Data for DB Update
    const accountData = {
      userId: userId,
      platform: "ytShorts", // Ensure this matches the platform key used elsewhere
      platformAccountId: googleUserId, // Use Google User ID (sub)
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token, // Store the refresh token!
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null, // Store expiry date
      scope: tokens.scope, // Store the granted scopes
      profileImage: profileImage,
      displayName: displayName,
      platformUsername: userInfo.email, // Store email as platformUsername
      status: "active",
      errorMessage: null,
    };

    console.log(
      "YouTube Callback: Preparing to upsert data for user:",
      userId,
      "Google User ID:",
      googleUserId
    );

    // 7. Upsert SocialAccount in Database
    const updateResult = await SocialAccount.updateOne(
      { userId: userId, platform: "ytShorts", platformAccountId: googleUserId },
      { $set: accountData },
      { upsert: true }
    );

    if (updateResult.acknowledged) {
      const action = updateResult.upsertedId ? "created" : "updated";
      console.log(`YouTube account ${action} successfully for user: ${userId}`);
      // Redirect back to the authenticate page with success
      return NextResponse.redirect(
        `${authenticatePage}?platform=ytShorts&success=true`
      );
    } else {
      console.error(
        "YouTube Callback Error: Database update failed to acknowledge for user:",
        userId
      );
      throw new Error(
        "Failed to save YouTube account information to the database."
      );
    }
  } catch (error) {
    console.error("YouTube Callback Error:", error);
    let message = "Failed to connect YouTube account.";
    if (error?.response?.data?.error_description) {
      message = `Google Error: ${error.response.data.error_description}`;
    } else if (error.message?.includes("invalid_grant")) {
      message =
        "Authorization code invalid or expired. Please try connecting again.";
    } else {
      message = error.message || message;
    }
    return redirectWithError(message);
  }
}
