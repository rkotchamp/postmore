import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToMongoose } from "@/app/lib/db/mongoose";
import SocialAccount from "@/app/models/SocialAccount";

// Use Threads-specific configuration
const clientId = process.env.THREAD_APP_ID || process.env.THREAD_META_APP_ID;
const clientSecret = process.env.THREAD_APP_SECRET;
const redirectUri = process.env.THREAD_REDIRECT_URI;

/**
 * Exchanges authorization code for short-lived access token using Threads API
 */
async function getShortLivedToken(code) {
  const url = "https://graph.threads.net/oauth/access_token";
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code: code,
  });

  console.log("🔄 Exchanging authorization code for short-lived token...");
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error("Failed to get short-lived token:", data);
    throw new Error(
      data.error?.message || data.error_description || "Failed to exchange authorization code"
    );
  }

  return data.access_token;
}

/**
 * Exchanges short-lived token for long-lived token (60 days)
 */
async function getLongLivedToken(shortLivedToken) {
  const url = "https://graph.threads.net/access_token";
  const params = new URLSearchParams({
    grant_type: "th_exchange_token",
    client_secret: clientSecret,
    access_token: shortLivedToken,
  });

  console.log("🔄 Exchanging short-lived token for long-lived token...");
  
  const response = await fetch(`${url}?${params}`);
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error("Failed to get long-lived token:", data);
    throw new Error(
      data.error?.message || data.error_description || "Failed to exchange for long-lived token"
    );
  }

  return {
    access_token: data.access_token,
    expires_in: data.expires_in, // Should be 5184000 (60 days)
  };
}

/**
 * Fetches Threads user profile information using Threads API
 */
async function getThreadsProfile(accessToken) {
  console.log("🧵 Fetching Threads profile information...");
  
  // Use Threads Graph API endpoint with proper fields
  const url = `https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url,threads_biography&access_token=${accessToken}`;
  
  const response = await fetch(url);
  const data = await response.json();

  console.log("📊 Threads profile response:", {
    status: response.status,
    ok: response.ok,
    hasId: !!data.id,
    username: data.username,
    name: data.name,
    error: data.error
  });

  if (!response.ok || !data.id) {
    console.error("❌ Failed to get Threads profile:", data);
    return null;
  }

  const result = {
    id: data.id,
    name: data.name,
    username: data.username,
    profile_picture_url: data.threads_profile_picture_url,
    biography: data.threads_biography,
  };
  
  console.log("🎉 Successfully retrieved Threads profile:", {
    id: result.id,
    username: result.username,
    name: result.name,
    hasProfilePic: !!result.profile_picture_url
  });
  
  return result;
}

/**
 * GET handler for Threads OAuth callback
 */
export async function GET(request) {
  const redirectWithError = (message, details = null) => {
    console.error("Threads Error:", { message, details });
    const params = new URLSearchParams({
      platform: "threads",
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
    // 1. Get authorization code and state from URL
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const state = searchParams.get("state");

    // Parse state for debugging info
    let stateData = null;
    if (state) {
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      } catch (e) {
        console.warn("Threads Callback: Could not parse state:", e.message);
      }
    }

    console.log("Threads Callback: Received callback with params:", {
      code: code ? `present (length: ${code.length})` : "missing",
      error,
      errorDescription,
      state: stateData,
      fullUrl: request.url.replace(code || '', '[REDACTED]')
    });

    if (error || !code) {
      return redirectWithError(
        errorDescription || error || "No authorization code received", 
        { error, errorDescription }
      );
    }

    // 2. Exchange authorization code for short-lived token
    const shortLivedToken = await getShortLivedToken(code);
    console.log("✅ Successfully obtained short-lived token");

    // 3. Exchange short-lived token for long-lived token
    const longLivedTokenData = await getLongLivedToken(shortLivedToken);
    console.log("✅ Successfully obtained long-lived token:", {
      expires_in: longLivedTokenData.expires_in,
      expires_in_days: Math.round(longLivedTokenData.expires_in / 86400)
    });

    // 4. Get Threads profile
    const threadsProfile = await getThreadsProfile(longLivedTokenData.access_token);
    
    if (!threadsProfile) {
      const debugInfo = {
        tokenValid: !!longLivedTokenData.access_token,
        timestamp: new Date().toISOString(),
      };
      
      const params = new URLSearchParams({
        platform: "threads",
        error: "Failed to retrieve Threads profile",
        debug: JSON.stringify(debugInfo)
      });
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/authenticate?${params}`
      );
    }

    // 5. Get user from NextAuth session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return redirectWithError("User not authenticated - please log in first");
    }

    await connectToMongoose();

    // 6. Calculate token expiry date
    const tokenExpiryDate = new Date(Date.now() + (longLivedTokenData.expires_in * 1000));

    // 7. Save Threads account  
    const accountData = {
      userId: session.user.id,
      platform: "threads",
      platformAccountId: threadsProfile.id,
      accessToken: longLivedTokenData.access_token,
      displayName: threadsProfile.name,
      platformUsername: threadsProfile.username,
      profileImage: threadsProfile.profile_picture_url,
      status: "active",
      lastRefreshed: new Date(),
      tokenExpiry: tokenExpiryDate,
      scope: "threads_basic,threads_content_publish",
      metadata: {
        platform: "threads",
        biography: threadsProfile.biography,
        tokenType: "long_lived",
        expiresIn: longLivedTokenData.expires_in,
        connectedAt: new Date().toISOString()
      }
    };

    console.log("Threads Callback: Upserting account:", {
      userId: session.user.id,
      platformAccountId: threadsProfile.id,
      username: threadsProfile.username,
      tokenExpiryDate: tokenExpiryDate.toISOString()
    });

    await SocialAccount.findOneAndUpdate(
      {
        userId: session.user.id,
        platform: "threads",
        platformAccountId: threadsProfile.id,
      },
      accountData,
      { upsert: true, new: true }
    );

    console.log("Threads Callback: Successfully saved account");

    // 8. Redirect to success page
    const successParams = new URLSearchParams({
      platform: "threads",
      success: "true",
      username: threadsProfile.username,
    });
    
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/authenticate?${successParams}`
    );
    
  } catch (error) {
    console.error("Threads Callback Error:", error);
    return redirectWithError(error.message || "An unexpected error occurred", {
      stack: error.stack,
    });
  }
}