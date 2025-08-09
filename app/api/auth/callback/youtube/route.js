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


  // Redirect helper for errors
  const redirectWithError = (message) => {
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
    return redirectWithError(
      "Server configuration error: YouTube connection is not properly configured."
    );
  }

  try {
    // 1. Get User Session from your app
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return redirectWithError(
        "Authentication required. Please log in to connect YouTube."
      );
    }
    const userId = session.user.id;

    // 2. Exchange Authorization Code for Tokens
    const oAuth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
    const { tokens } = await oAuth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      // Note: Refresh token might only be sent on first authorization/consent
      // Provide a more specific message if refresh token is missing after first attempt
      return redirectWithError(
        "Failed to retrieve necessary tokens from Google. Ensure offline access was requested and granted. You might need to disconnect and reconnect the account."
      );
    }
    oAuth2Client.setCredentials(tokens);

    // 3. Get Google User Info
    // Using the UserInfo endpoint is often simpler than decoding the ID token manually
    const userInfoResponse = await oAuth2Client.request({
      url: "https://www.googleapis.com/oauth2/v3/userinfo",
    });
    const userInfo = userInfoResponse.data;

    if (!userInfo || !userInfo.sub) {
      return redirectWithError(
        "Failed to verify user information with Google."
      );
    }

    const googleUserId = userInfo.sub; // Google's unique user ID
    
    // 4. Get YouTube Channel Information using the readonly scope
    let displayName = userInfo.name || session.user.name || "YouTube User"; // Fallback to Google name
    let profileImage = userInfo.picture || session.user.image; // Fallback to Google picture
    
    try {
      const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });
      
      // Get the user's YouTube channels with snippet data
      const channelsResponse = await youtube.channels.list({
        part: 'snippet',
        mine: true
      });

      if (channelsResponse.data.items && channelsResponse.data.items.length > 0) {
        // Use the first channel's data
        const channel = channelsResponse.data.items[0];
        displayName = channel.snippet.title;
        
        // Get channel profile image (use highest quality available)
        if (channel.snippet.thumbnails) {
          // YouTube provides different sizes: default, medium, high
          profileImage = channel.snippet.thumbnails.high?.url || 
                        channel.snippet.thumbnails.medium?.url || 
                        channel.snippet.thumbnails.default?.url ||
                        profileImage; // Keep Google fallback if no thumbnails
        }
      }
    } catch (channelError) {
      // Continue with Google account data as fallback
    }


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


    // 7. Upsert SocialAccount in Database
    const updateResult = await SocialAccount.updateOne(
      { userId: userId, platform: "ytShorts", platformAccountId: googleUserId },
      { $set: accountData },
      { upsert: true }
    );

    if (updateResult.acknowledged) {
      // Redirect back to the authenticate page with success
      return NextResponse.redirect(
        `${authenticatePage}?platform=ytShorts&success=true`
      );
    } else {
      throw new Error(
        "Failed to save YouTube account information to the database."
      );
    }
  } catch (error) {
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
