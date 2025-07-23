import { NextResponse } from "next/server";

// Define the necessary scopes for LinkedIn functionality
// profile: Read user's basic profile information
// w_member_social: Share content on user's behalf
// r_basicprofile: Read basic profile information (deprecated, but included for compatibility)
// r_emailaddress: Read user's email address
const scopes = [
  "profile",
  "w_member_social",
  "r_emailaddress",
].join(" "); // LinkedIn scopes should be space-separated

/**
 * GET handler for initiating LinkedIn OAuth connection.
 * Generates the LinkedIn Authorization URL and returns it.
 */
export async function GET(request) {
  console.log("Initiating LinkedIn connection flow");

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error(
      "LinkedIn Connect Error: Missing LINKEDIN_CLIENT_ID or LINKEDIN_REDIRECT_URI in environment variables."
    );
    return NextResponse.json(
      {
        message:
          "Server configuration error: LinkedIn connection is not properly configured.",
      },
      { status: 500 }
    );
  }

  // Generate a random state value for CSRF protection
  const state = Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15);

  // Construct the LinkedIn Authorization URL
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state: state,
  });

  const authorizeUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;

  console.log("Generated LinkedIn Auth URL:", authorizeUrl);

  // Return the URL to the frontend
  return NextResponse.json({ authorizeUrl: authorizeUrl }, { status: 200 });
}