import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";

// Define the necessary scopes for YouTube functionality
const scopes = [
  "https://www.googleapis.com/auth/youtube.upload", // To upload Shorts/videos
  "https://www.googleapis.com/auth/youtube.readonly", // To read channel info, etc.
  "https://www.googleapis.com/auth/userinfo.profile", // Get basic profile info (name, picture)
  "https://www.googleapis.com/auth/userinfo.email", // Get user's email
];

/**
 * GET handler for initiating YouTube OAuth connection.
 * Generates the Google Authorization URL and returns it.
 */
export async function GET(request) {
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!redirectUri || !clientId || !clientSecret) {
    return NextResponse.json(
      {
        message:
          "Server configuration error: Missing Google OAuth credentials or YouTube redirect URI.",
      },
      { status: 500 }
    );
  }

  try {
    // Create an OAuth2 client instance
    const oAuth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

    // Generate the authorization URL
    const authorizeUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline", // Request refresh token
      scope: scopes,
      prompt: "consent", // Force consent screen to ensure refresh token is granted
      // Optional: include state for CSRF protection if needed
      // state: "some_random_string"
    });

    // Return the URL to the frontend
    return NextResponse.json({ authorizeUrl: authorizeUrl }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to initiate YouTube connection.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
