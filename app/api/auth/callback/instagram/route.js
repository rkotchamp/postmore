import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToMongoose } from "@/app/lib/db/mongoose";
import SocialAccount from "@/app/models/SocialAccount";
import User from "@/app/models/userSchema";

const clientId = process.env.INSTAGRAM_APP_ID;
const clientSecret = process.env.INSTAGRAM_APP_SECRET;
const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
const graphApiVersion = process.env.FACEBOOK_GRAPH_API_VERSION || "v19.0";

/**
 * Exchanges a short-lived token for a long-lived token.
 */
async function getLongLivedToken(shortLivedToken) {
  const url = `https://graph.facebook.com/${graphApiVersion}/oauth/access_token`;
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: clientId,
    client_secret: clientSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(`${url}?${params}`);
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error("Failed to get long-lived token:", data);
    throw new Error(
      data.error?.message || "Failed to exchange for long-lived token"
    );
  }

  return data.access_token;
}

/**
 * Fetches Instagram Business Account details linked to a Facebook Page.
 */
async function getInstagramAccount(pageId, accessToken) {
  // First, get the Instagram Business Account ID
  const url = `https://graph.facebook.com/${graphApiVersion}/${pageId}?fields=instagram_business_account&access_token=${accessToken}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || !data.instagram_business_account?.id) {
    console.log(
      `No Instagram Business Account found for page ${pageId}:`,
      data
    );
    return null;
  }

  // Then, get the Instagram Business Account details
  const igAccountId = data.instagram_business_account.id;
  const detailsUrl = `https://graph.facebook.com/${graphApiVersion}/${igAccountId}?fields=username,profile_picture_url&access_token=${accessToken}`;
  const detailsResponse = await fetch(detailsUrl);
  const detailsData = await detailsResponse.json();

  if (!detailsResponse.ok) {
    console.error(
      `Failed to get Instagram details for account ${igAccountId}:`,
      detailsData
    );
    return null;
  }

  return {
    id: igAccountId,
    username: detailsData.username,
    profilePictureUrl: detailsData.profile_picture_url,
  };
}

/**
 * GET handler for Facebook OAuth callback (specifically for Instagram connection).
 */
export async function GET(request) {
  const redirectWithError = (message, details = null) => {
    console.error("Instagram Error:", { message, details });
    const params = new URLSearchParams({
      platform: "instagram",
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
    const errorReason = searchParams.get("error_reason");

    console.log("Instagram Callback: Received callback with params:", {
      code: code ? "present" : "missing",
      error,
      errorReason,
    });

    if (error || !code) {
      return redirectWithError(error || "No authorization code received", {
        error,
        errorReason,
      });
    }

    // 2. Exchange code for short-lived token
    const tokenUrl = `https://graph.facebook.com/${graphApiVersion}/oauth/access_token`;
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    });

    const response = await fetch(`${tokenUrl}?${params}`);
    const data = await response.json();

    if (!response.ok || !data.access_token) {
      console.error("Failed to exchange code for token:", data);
      return redirectWithError(
        "Failed to exchange authorization code for access token",
        data.error
      );
    }

    // 3. Exchange short-lived token for long-lived token
    const longLivedToken = await getLongLivedToken(data.access_token);
    console.log("Instagram Callback: Successfully obtained long-lived token");

    // 4. Get User's Facebook Pages
    const pagesUrl = `https://graph.facebook.com/${graphApiVersion}/me/accounts?access_token=${longLivedToken}`;
    const pagesResponse = await fetch(pagesUrl);
    const pagesData = await pagesResponse.json();

    if (!pagesResponse.ok || !pagesData.data) {
      console.error("Failed to get Facebook pages:", pagesData);
      return redirectWithError(
        "Failed to retrieve Facebook Pages",
        pagesData.error
      );
    }

    const pages = pagesData.data;
    console.log(`Instagram Callback: Found ${pages.length} Facebook Pages`);

    // 5. Find Instagram Business Account
    let instagramAccount = null;
    for (const page of pages) {
      console.log(`Checking Instagram Business Account for page: ${page.name}`);
      const igAccount = await getInstagramAccount(page.id, page.access_token);
      if (igAccount) {
        instagramAccount = {
          ...igAccount,
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token,
        };
        break;
      }
    }

    if (!instagramAccount) {
      return redirectWithError(
        "No Instagram Business or Creator accounts found",
        { pagesChecked: pages.length }
      );
    }

    // 6. Get user from session
    const cookieStore = cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
      return redirectWithError("User not authenticated");
    }

    await connectToMongoose();
    const user = await User.findOne({ session });

    if (!user) {
      return redirectWithError("User not found");
    }

    // 7. Save Instagram account
    const accountData = {
      userId: user._id,
      platform: "instagram",
      platformAccountId: instagramAccount.id,
      accessToken: instagramAccount.pageAccessToken, // Use page access token for API calls
      pageAccessToken: instagramAccount.pageAccessToken,
      pageId: instagramAccount.pageId,
      pageName: instagramAccount.pageName,
      profileImage: instagramAccount.profilePictureUrl,
      platformUsername: instagramAccount.username,
      status: "active",
      lastRefreshed: new Date(),
      tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days for page tokens
    };

    console.log("Instagram Callback: Upserting account:", {
      userId: user._id,
      platformAccountId: instagramAccount.id,
      username: instagramAccount.username,
    });

    const result = await SocialAccount.findOneAndUpdate(
      {
        userId: user._id,
        platform: "instagram",
        platformAccountId: instagramAccount.id,
      },
      accountData,
      { upsert: true, new: true }
    );

    console.log("Instagram Callback: Successfully saved account");

    // 8. Redirect to success page
    const successParams = new URLSearchParams({
      platform: "instagram",
      success: "true",
      username: instagramAccount.username,
    });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/authenticate?${successParams}`
    );
  } catch (error) {
    console.error("Instagram Callback Error:", error);
    return redirectWithError(error.message || "An unexpected error occurred", {
      stack: error.stack,
    });
  }
}
