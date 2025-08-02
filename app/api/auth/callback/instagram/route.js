import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToMongoose } from "@/app/lib/db/mongoose";
import SocialAccount from "@/app/models/SocialAccount";
import User from "@/app/models/userSchema";

const clientId = process.env.META_APP_ID;
const clientSecret = process.env.META_APP_SECRET;
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
  console.log(`  🔍 Checking Instagram connection for page ${pageId}...`);
  
  // First, get the Instagram Business Account ID
  const url = `https://graph.facebook.com/${graphApiVersion}/${pageId}?fields=instagram_business_account&access_token=${accessToken}`;
  console.log(`  📡 Making request to check Instagram link...`);
  
  const response = await fetch(url);
  const data = await response.json();

  console.log(`  📊 Instagram link check response:`, {
    status: response.status,
    ok: response.ok,
    hasInstagramAccount: !!data.instagram_business_account?.id,
    data: data
  });

  if (!response.ok || !data.instagram_business_account?.id) {
    console.log(`  ❌ No Instagram Business Account found for page ${pageId}`);
    if (data.error) {
      console.log(`  🚨 API Error:`, data.error);
    }
    return null;
  }

  // Then, get the Instagram Business Account details
  const igAccountId = data.instagram_business_account.id;
  console.log(`  ✅ Found Instagram Business Account ID: ${igAccountId}`);
  console.log(`  📱 Fetching Instagram account details...`);
  
  const detailsUrl = `https://graph.facebook.com/${graphApiVersion}/${igAccountId}?fields=username,profile_picture_url&access_token=${accessToken}`;
  const detailsResponse = await fetch(detailsUrl);
  const detailsData = await detailsResponse.json();

  console.log(`  📋 Instagram details response:`, {
    status: detailsResponse.status,
    ok: detailsResponse.ok,
    username: detailsData.username,
    hasProfilePic: !!detailsData.profile_picture_url,
    error: detailsData.error
  });

  if (!detailsResponse.ok) {
    console.error(`  ❌ Failed to get Instagram details for account ${igAccountId}:`, detailsData);
    return null;
  }

  const result = {
    id: igAccountId,
    username: detailsData.username,
    profilePictureUrl: detailsData.profile_picture_url,
  };
  
  console.log(`  🎉 Successfully retrieved Instagram account:`, result);
  return result;
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
    // 1. Get authorization code and state from URL
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorReason = searchParams.get("error_reason");
    const state = searchParams.get("state");

    // Parse state for debugging info
    let stateData = null;
    if (state) {
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      } catch (e) {
        console.warn("Instagram Callback: Could not parse state:", e.message);
      }
    }

    console.log("Instagram Callback: Received callback with params:", {
      code: code ? `present (length: ${code.length})` : "missing",
      error,
      errorReason,
      state: stateData,
      fullUrl: request.url
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

    console.log("🔄 Instagram Callback: Starting token exchange...");
    console.log("📝 Token exchange request details:", {
      url: tokenUrl,
      clientId: clientId,
      redirectUri: redirectUri,
      codePresent: !!code,
      codeLength: code?.length || 0
    });

    const response = await fetch(`${tokenUrl}?${params}`);
    const data = await response.json();

    console.log("✅ Token exchange response:", {
      status: response.status,
      ok: response.ok,
      hasAccessToken: !!data.access_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
      error: data.error
    });

    if (!response.ok || !data.access_token) {
      console.error("❌ Failed to exchange code for token:", data);
      return redirectWithError(
        "Failed to exchange authorization code for access token",
        data.error
      );
    }

    // 3. Exchange short-lived token for long-lived token
    const longLivedToken = await getLongLivedToken(data.access_token);
    console.log("Instagram Callback: Successfully obtained long-lived token");

    // 4. First, let's check what permissions our token actually has
    console.log("🔐 Instagram Callback: Checking token permissions...");
    const permissionsUrl = `https://graph.facebook.com/${graphApiVersion}/me/permissions?access_token=${longLivedToken}`;
    const permissionsResponse = await fetch(permissionsUrl);
    const permissionsData = await permissionsResponse.json();
    
    console.log("📋 Token permissions:", {
      status: permissionsResponse.status,
      ok: permissionsResponse.ok,
      permissions: permissionsData.data?.map(p => ({ permission: p.permission, status: p.status })),
      error: permissionsData.error
    });

    // 5. Get User's Facebook Pages using me/accounts endpoint
    console.log("📄 Instagram Callback: Fetching Facebook Pages...");
    
    const accountsUrl = `https://graph.facebook.com/${graphApiVersion}/me/accounts?access_token=${longLivedToken}`;
    console.log("🔗 Using me/accounts endpoint...");
    
    const pagesResponse = await fetch(accountsUrl);
    const pagesData = await pagesResponse.json();

    console.log("📊 me/accounts API Response:", {
      status: pagesResponse.status,
      ok: pagesResponse.ok,
      hasData: !!pagesData.data,
      dataLength: pagesData.data?.length || 0,
      fullResponse: pagesData,
      error: pagesData.error
    });

    if (!pagesResponse.ok || !pagesData.data) {
      console.error("❌ Failed to get Facebook pages:", pagesData);
      const errorMsg = pagesData.error?.message || 'Unknown error';
      const errorCode = pagesData.error?.code || 'No code';
      
      return redirectWithError(
        `Failed to retrieve Facebook Pages - API ERROR: ${errorMsg} (Code: ${errorCode}) via accounts endpoint`,
        pagesData.error
      );
    }

    const pages = pagesData.data;
    console.log(`🎯 Found ${pages.length} Facebook Pages:`, 
      pages.map(p => ({ 
        id: p.id, 
        name: p.name, 
        category: p.category,
        access_token: p.access_token ? 'present' : 'missing',
        tasks: p.tasks || 'none'
      })));

    // 5. Find Instagram Business Account
    let instagramAccount = null;
    console.log(`🔍 Checking ${pages.length} pages for Instagram Business Accounts...`);
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      console.log(`📱 [${i + 1}/${pages.length}] Checking page: "${page.name}" (ID: ${page.id})`);
      console.log(`🔑 Page access token: ${page.access_token ? 'present' : 'MISSING!'}`);
      
      if (!page.access_token) {
        console.log(`⚠️  Skipping page "${page.name}" - no access token available`);
        continue;
      }
      
      const igAccount = await getInstagramAccount(page.id, page.access_token);
      if (igAccount) {
        console.log(`✅ Found Instagram Business Account for "${page.name}":`, igAccount);
        instagramAccount = {
          ...igAccount,
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token,
        };
        break;
      } else {
        console.log(`❌ No Instagram Business Account found for page: "${page.name}"`);
      }
    }
    
    console.log(`🎯 Instagram account search complete. Result: ${instagramAccount ? 'FOUND' : 'NOT FOUND'}`);
    if (instagramAccount) {
      console.log(`🎉 Final Instagram account details:`, {
        id: instagramAccount.id,
        username: instagramAccount.username,
        pageId: instagramAccount.pageId,
        pageName: instagramAccount.pageName
      });
    }

    if (!instagramAccount) {
      // Add comprehensive debug info for production debugging
      const grantedPermissions = permissionsData.data?.filter(p => p.status === 'granted').map(p => p.permission) || [];
      const debugInfo = {
        pagesChecked: pages.length,
        pagesFound: pages.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          hasAccessToken: !!p.access_token,
          tokenLength: p.access_token?.length || 0
        })),
        tokenValid: !!longLivedToken,
        tokenLength: longLivedToken?.length || 0,
        grantedPermissions: grantedPermissions,
        timestamp: new Date().toISOString(),
        graphApiVersion: graphApiVersion
      };
      
      // Create a simple debug string that will definitely show up
      const hasPagesPerm = grantedPermissions.includes('pages_show_list');
      const debugString = `Pages:${pages.length}|Token:${!!longLivedToken}|API:${graphApiVersion}|PagesShowList:${hasPagesPerm}|Perms:${grantedPermissions.join(',')}|AppType:${permissionsData.data?.[0]?.permission || 'none'}|Time:${new Date().getHours()}:${new Date().getMinutes()}`;
      
      const params = new URLSearchParams({
        platform: "instagram",
        error: `No Instagram Business accounts found - DEBUG: ${debugString}`,
        debug: JSON.stringify({ 
          pagesChecked: pages.length, 
          permissions: grantedPermissions,
          rawPagesResponse: pagesData,
          tokenInfo: { hasToken: !!longLivedToken, tokenStart: longLivedToken?.substring(0, 10) }
        })
      });
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/authenticate?${params}`
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
