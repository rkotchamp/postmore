import { NextResponse } from "next/server";

// Instagram Business Login API scopes (July 2024+ direct Instagram login)
// No Facebook Pages required — authenticates directly with Instagram Business/Creator accounts
const scopes = [
  "instagram_business_basic",           // Required: profile info, account ID, username
  "instagram_business_content_publish", // Publish photos, videos, reels, carousels
  "instagram_business_manage_comments", // Read/reply/delete comments
  "instagram_business_manage_messages", // DMs and messaging
  "instagram_business_manage_insights", // Analytics and post insights
].join(",");

/**
 * GET /api/auth/instagram/connect
 * Initiates the Instagram Business Login OAuth flow.
 * Uses the new Instagram Platform API (api.instagram.com) — no Facebook Pages needed.
 */
export async function GET(request) {
  console.log("Initiating Instagram Business Login flow (direct Instagram OAuth)");

  const appId = process.env.INSTAGRAM_APP_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

  if (!appId || !redirectUri) {
    console.error("Instagram Connect Error: Missing META_APP_ID or INSTAGRAM_REDIRECT_URI");
    return NextResponse.json(
      { message: "Server configuration error: Instagram connection is not properly configured." },
      { status: 500 }
    );
  }

  const state = Buffer.from(
    JSON.stringify({ timestamp: Date.now(), source: "instagram_connect" })
  ).toString("base64");

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: "code",
    state,
  });

  // Instagram Business Login authorize endpoint — NOT the Facebook dialog
  const authorizeUrl = `https://api.instagram.com/oauth/authorize?${params.toString()}`;

  console.log("Generated Instagram authorize URL:", authorizeUrl);

  return NextResponse.json({ authorizeUrl }, { status: 200 });
}
