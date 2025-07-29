import { NextResponse } from "next/server";

// Define the essential scopes for Instagram Business functionality
// instagram_basic: Read user profile info and media
// pages_show_list: List Facebook Pages the user manages (needed to find linked IG accounts)
// pages_manage_posts: Manage Page posts (often required to access pages)
// instagram_content_publish: Publish media to Instagram Business/Creator account
// pages_read_engagement: Read page engagement metrics
const scopes = [
  "instagram_basic",
  "pages_show_list",
  "pages_manage_posts",
  "instagram_content_publish", 
  "pages_read_engagement",
].join(","); // Scopes should be a comma-separated string

/**
 * GET handler for initiating Instagram OAuth connection via Facebook Login.
 * Generates the Facebook Authorization URL and returns it.
 */
export async function GET(request) {
  console.log("Initiating Instagram connection flow via Facebook Login");

  const appId = process.env.META_APP_ID; // Uses the correct Meta App ID with updated secret
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

  if (!appId || !redirectUri) {
    console.error(
      "Instagram Connect Error: Missing META_APP_ID or INSTAGRAM_REDIRECT_URI in environment variables."
    );
    return NextResponse.json(
      {
        message:
          "Server configuration error: Instagram connection is not properly configured.",
      },
      { status: 500 }
    );
  }

  // Construct the Facebook Login Dialog URL
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: "code",
    // Optional: include state for CSRF protection if needed
    // state: "your_random_state_string",
  });

  const authorizeUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  // Note: Using latest Graph API version (v19.0), adjust if needed

  console.log("Generated Instagram/Facebook Auth URL:", authorizeUrl);

  // Return the URL to the frontend
  return NextResponse.json({ authorizeUrl: authorizeUrl }, { status: 200 });
}
