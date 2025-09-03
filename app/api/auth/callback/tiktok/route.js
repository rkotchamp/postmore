import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToMongoose from "@/app/lib/db/mongoose";
import User from "@/app/models/userSchema"; // User model
import SocialAccount from "@/app/models/SocialAccount"; // Assuming you have a SocialAccount model

/**
 * TikTok OAuth callback handler
 * Exchanges code for token, fetches user info, and stores/updates the connection.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  console.log("TikTok callback received:", {
    code: code ? `${code.substring(0, 10)}...` : "MISSING",
    state: state ? `${state.substring(0, 10)}...` : "MISSING",
  });

  // Redirect helper
  const redirectWithError = (message) => {
    console.error(`TikTok Auth Error: ${message}`);
    return NextResponse.redirect(
      `${appUrl}/authenticate?platform=tiktok&error=true&message=${encodeURIComponent(
        message
      )}`
    );
  };

  try {
    // 1. Validate code and state
    if (!code) {
      return redirectWithError("No authorization code provided by TikTok.");
    }
    // TODO: Add state validation against stored state (e.g., from localStorage or cookie)
    // const storedState = ...;
    // if (!state || state !== storedState) {
    //   return redirectWithError('Invalid state parameter for CSRF protection.');
    // }

    // 2. Get User Session
    console.log("Attempting to get server session...");
    const session = await getServerSession(authOptions);
    // *** ADDED SESSION LOGGING ***
    console.log("Server session retrieved:", session);

    if (!session?.user?.id) {
      // *** ADDED MORE SPECIFIC LOGGING ***
      console.error("Session invalid or user ID missing:", session);
      return redirectWithError("User session not found or invalid.");
    }
    const userId = session.user.id;
    console.log("User ID from session:", userId);

    // 3. Exchange Code for Access Token
    const redirectUri = process.env.TIKTOK_REDIRECT_URI;
    if (!redirectUri) {
      return redirectWithError("Missing TikTok redirect URI configuration.");
    }
    const tokenParams = {
      client_key: process.env.TIKTOK_CLIENT_ID,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    };
    
    console.log("Token params:", { ...tokenParams, client_secret: "***REDACTED***" });

    const tokenUrl = "https://open.tiktokapis.com/v2/oauth/token/";
    console.log("Requesting token from TikTok:", tokenUrl);
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams(tokenParams),
    });

    const tokenData = await tokenResponse.json();
    console.log("Raw token response data:", tokenData);

    // *** MODIFIED TOKEN CHECK LOGIC ***
    if (!tokenResponse.ok || !tokenData.access_token || !tokenData.open_id) {
      console.error(
        "TikTok token exchange failed. Status:",
        tokenResponse.status,
        "Response Data:",
        tokenData
      );
      return redirectWithError(
        `Token exchange failed: ${
          tokenData.error_description ||
          tokenData.message ||
          tokenData.error ||
          "Invalid token response"
        }`
      );
    }

    console.log("TikTok token exchange successful.");

    const { access_token, refresh_token, expires_in, open_id, scope } =
      tokenData;

    // 4. Fetch User Info from TikTok
    const userInfoUrl = `https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name`;
    console.log("Fetching user info from TikTok:", userInfoUrl);
    const userInfoResponse = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const userInfoData = await userInfoResponse.json();

    if (!userInfoResponse.ok || userInfoData.error?.code !== "ok") {
      console.error("Failed to fetch TikTok user info:", userInfoData);
      // Consider if you NEED user info to proceed. If so, return error.
      // If not critical, maybe log and continue with default/placeholder values.
      return redirectWithError(
        `Failed to fetch user info: ${
          userInfoData.error?.message || "Unknown user info error"
        }`
      );
    }

    const userData = userInfoData.data.user;
    console.log("TikTok user info fetched:", userData);

    // Basic check: Ensure open_id from user info matches token response if available
    if (userData.open_id && open_id !== userData.open_id) {
      console.warn("OpenID mismatch between token and user info endpoint!", {
        token_open_id: open_id,
        user_info_open_id: userData.open_id,
      });
      // Trust the open_id from the token endpoint as primary
    }

    // 5. Connect to Database
    await connectToMongoose();

    // 6. Prepare Data for DB Update (using schema field names)
    const accountData = {
      userId: userId,
      platform: "tiktok",
      platformAccountId: open_id, // *** Use platformAccountId (stores open_id) ***
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiry: new Date(Date.now() + expires_in * 1000), // *** Use tokenExpiry ***
      scope: scope, // *** Use scope (String) ***
      profileImage: userData?.avatar_url || null,
      displayName: userData?.display_name || null,
      platformUsername: userData?.display_name || null, // Or another relevant field if available
      status: "active", // Set status to active
      errorMessage: null, // Clear any previous error message
    };

    // *** ADDED DB LOGGING ***
    console.log(
      "Attempting to upsert TikTok social account for userId:",
      userId,
      "platformAccountId:",
      open_id
    );
    console.log("Data to upsert:", accountData);

    try {
      const updateResult = await SocialAccount.updateOne(
        {
          userId: userId,
          platform: "tiktok",
          platformAccountId: open_id, // *** Use platformAccountId in query ***
        },
        { $set: accountData },
        { upsert: true }
      );
      // *** ADDED DB LOGGING ***
      console.log("Database update result:", updateResult);

      if (updateResult.acknowledged) {
        console.log(
          `TikTok account ${
            updateResult.upsertedId ? "created" : "updated"
          } successfully for user: ${userId}`
        );
      } else {
        console.error(
          "Database update failed to acknowledge for user:",
          userId,
          "Result:",
          updateResult
        );
        // Decide if this is a critical error
        return redirectWithError("Failed to save account information.");
      }
    } catch (dbError) {
      console.error("Database update error:", dbError);
      return redirectWithError("Error saving account information to database.");
    }

    // 7. Redirect to success page
    console.log("Redirecting to success URL.");
    return NextResponse.redirect(
      `${appUrl}/authenticate?platform=tiktok&success=true`
    );
  } catch (error) {
    console.error("TikTok callback general error:", error);
    return redirectWithError(error.message || "An unknown error occurred.");
  }
}
