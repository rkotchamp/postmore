import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToMongoose from "@/app/lib/db/mongoose";
import SocialAccount from "@/app/models/SocialAccount";

const clientId = process.env.LINKEDIN_CLIENT_ID;
const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

/**
 * Exchanges LinkedIn authorization code for access token.
 */
async function getLinkedInAccessToken(code) {
  const tokenUrl = "https://www.linkedin.com/oauth/v2/accessToken";
  
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error("Failed to get LinkedIn access token:", data);
    throw new Error(
      data.error_description || data.error || "Failed to get access token"
    );
  }

  return data;
}

/**
 * Fetches LinkedIn user profile information.
 */
async function getLinkedInProfile(accessToken) {
  const profileUrl = "https://api.linkedin.com/v2/userinfo";
  
  const response = await fetch(profileUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to get LinkedIn profile:", data);
    throw new Error(
      data.error_description || data.error || "Failed to get profile"
    );
  }

  return data;
}

/**
 * GET handler for LinkedIn OAuth callback.
 */
export async function GET(request) {
  const redirectWithError = (message, details = null) => {
    console.error("LinkedIn Error:", { message, details });
    const params = new URLSearchParams({
      platform: "linkedin",
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
    // 1. Get authorization code from URL
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const state = searchParams.get("state");

    console.log("LinkedIn Callback: Received callback with params:", {
      code: code ? "present" : "missing",
      error,
      errorDescription,
      state: state ? "present" : "missing",
    });

    if (error || !code) {
      return redirectWithError(errorDescription || error || "No authorization code received", {
        error,
        errorDescription,
      });
    }

    // 2. Exchange code for access token
    const tokenData = await getLinkedInAccessToken(code);
    console.log("LinkedIn Callback: Successfully obtained access token");

    // 3. Get user profile
    const profile = await getLinkedInProfile(tokenData.access_token);
    console.log("LinkedIn Callback: Successfully obtained profile");

    // 4. Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return redirectWithError("Authentication required. Please log in to connect LinkedIn.");
    }
    const userId = session.user.id;

    // 5. Connect to database
    await connectToMongoose();

    // 6. Prepare data for database
    const linkedinUserId = profile.sub; // LinkedIn's unique user ID
    const displayName = profile.name || session.user.name || "LinkedIn User";
    const profileImage = profile.picture || session.user.image;
    
    const accountData = {
      userId: userId,
      platform: "linkedin",
      platformAccountId: linkedinUserId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      tokenExpiry: tokenData.expires_in ? 
        new Date(Date.now() + tokenData.expires_in * 1000) : null,
      scope: tokenData.scope,
      profileImage: profileImage,
      displayName: displayName,
      platformUsername: profile.email,
      status: "active",
      errorMessage: null,
    };

    console.log("LinkedIn Callback: Preparing to upsert data for user:", userId, "LinkedIn User ID:", linkedinUserId);

    // 7. Upsert SocialAccount in Database
    try {
      const updateResult = await SocialAccount.findOneAndUpdate(
        { userId: userId, platform: "linkedin", platformAccountId: linkedinUserId },
        accountData,
        { upsert: true, new: true }
      );

      if (updateResult) {
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/authenticate?platform=linkedin&success=true`
        );
      } else {
        throw new Error("Database operation returned null");
      }
    } catch (dbError) {
      console.error("LinkedIn DB Error:", dbError.message);
      throw new Error("Failed to save LinkedIn account to database");
    }
  } catch (error) {
    console.error("LinkedIn Callback Error:", error);
    let message = "Failed to connect LinkedIn account.";
    if (error?.response?.data?.error_description) {
      message = `LinkedIn Error: ${error.response.data.error_description}`;
    } else if (error.message?.includes("invalid_grant")) {
      message = "Authorization code invalid or expired. Please try connecting again.";
    } else {
      message = error.message || message;
    }
    return redirectWithError(message);
  }
}