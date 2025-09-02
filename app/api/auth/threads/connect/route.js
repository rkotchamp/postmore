import { NextResponse } from "next/server";

// Define the essential scopes for Threads functionality
const scopes = [
  "threads_basic",
  "threads_content_publish",
].join(",");

/**
 * GET handler for initiating Threads OAuth connection.
 * Uses the official Threads OAuth endpoint, not Facebook.
 */
export async function GET(request) {
  console.log("🧵 Initiating Threads connection flow - Route reached!");
  console.log("🧵 Request URL:", request.url);

  // Use the Threads-specific app configuration from .env
  const appId = process.env.THREAD_APP_ID || process.env.THREAD_META_APP_ID;
  const redirectUri = process.env.THREAD_REDIRECT_URI; // Note: singular in .env

  console.log("🧵 Environment check:", {
    appId: appId ? '[PRESENT]' : '[MISSING]',
    redirectUri: redirectUri ? '[PRESENT]' : '[MISSING]',
    threadAppId: process.env.THREAD_APP_ID ? '[PRESENT]' : '[MISSING]',
    threadMetaAppId: process.env.THREAD_META_APP_ID ? '[PRESENT]' : '[MISSING]'
  });

  if (!appId || !redirectUri) {
    console.error(
      "🧵 Threads Connect Error: Missing THREAD_APP_ID or THREAD_REDIRECT_URI in environment variables."
    );
    return NextResponse.json(
      {
        message:
          "Server configuration error: Threads connection is not properly configured.",
      },
      { status: 500 }
    );
  }

  // Generate a state token to maintain debugging state and prevent CSRF
  const stateData = {
    timestamp: Date.now(),
    debug: true,
    source: "threads_connect",
    nonce: Math.random().toString(36).substring(2, 15)
  };
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64');

  // Construct the official Threads OAuth URL
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: "code",
    state: state,
  });

  // Use the official Threads OAuth endpoint
  const authorizeUrl = `https://threads.net/oauth/authorize?${params.toString()}`;

  console.log("🧵 Generated Threads OAuth URL:", {
    url: authorizeUrl.replace(appId, '[REDACTED]'),
    appId: appId ? '[PRESENT]' : '[MISSING]',
    redirectUri,
    scopes
  });

  console.log("🧵 About to return response...");

  // Return the URL to the frontend
  const response = NextResponse.json({ authorizeUrl: authorizeUrl }, { status: 200 });
  
  console.log("🧵 Response created successfully");
  
  return response;
}