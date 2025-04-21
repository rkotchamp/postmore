import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { AtpAgent } from "@atproto/api";
import connectToMongoose from "@/app/lib/db/mongoose";
import SocialAccount from "@/app/models/SocialAccount";
// TODO: Import encryption utilities if storing tokens encrypted
// import { encrypt, decrypt } from '@/app/lib/encryption';

/**
 * Asynchronously fetches the Bluesky profile and updates the DB record.
 * Called without await to avoid blocking the main login response.
 * @param {AtpAgent} agentInstance - Authenticated AtpAgent instance.
 * @param {string} userDid - The DID of the user whose profile to fetch.
 * @param {string} userId - The internal user ID for logging purposes.
 */
async function fetchAndUpdateProfile(agentInstance, userDid, userId) {
  try {
    const profileResponse = await agentInstance.getProfile({ actor: userDid });
    if (profileResponse?.data?.avatar) {
      const avatarUrl = profileResponse.data.avatar;

      await SocialAccount.updateOne(
        { userId: userId, platform: "bluesky", platformAccountId: userDid },
        { $set: { profileImage: avatarUrl } }
      );
    } else {
      console.log(`No avatar found in profile for user `);
    }
  } catch (profileError) {
    console.error(
      `Error fetching/updating Bluesky profile image for user ${userId}, DID ${userDid}:`,
      profileError.message
    );
    // Do not throw error, just log it. The main login already succeeded.
  }
}

/**
 * POST handler for Bluesky Login
 * Receives identifier (handle/email) and app password,
 * authenticates with Bluesky, and stores the session/account details.
 */
export async function POST(request) {
  let agent; // Define agent in the outer scope to be accessible in the async function call
  let userId; // Define userId in the outer scope
  let did; // Define did in the outer scope

  try {
    // 1. Get PostMore User Session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error("Bluesky Login Error: User session not found or invalid.");
      return NextResponse.json(
        { message: "Authentication required. Please log in." },
        { status: 401 }
      );
    }
    userId = session.user.id; // Assign to outer scope variable

    // 2. Get Credentials from Request Body
    let identifier, password;
    try {
      const body = await request.json();
      identifier = body.identifier;
      password = body.password;
      if (!identifier || !password) {
        throw new Error("Missing identifier or password in request body.");
      }
    } catch (error) {
      console.error(
        "Bluesky Login Error: Invalid request body:",
        error.message
      );
      return NextResponse.json(
        { message: `Invalid request: ${error.message}` },
        { status: 400 }
      );
    }

    // 3. Authenticate with Bluesky
    agent = new AtpAgent({
      // Assign to outer scope variable
      service: "https://bsky.social",
    });
    await agent.login({ identifier, password });
    if (!agent.session) {
      throw new Error(
        "Bluesky authentication completed but session data is unavailable."
      );
    }
    const { handle, accessJwt, refreshJwt } = agent.session;
    did = agent.session.did; // Assign to outer scope variable

    // 4. Connect to Database
    await connectToMongoose();

    // 5. Prepare Initial Data (without profile image)
    const accountData = {
      userId: userId,
      platform: "bluesky",
      platformAccountId: did,
      accessToken: accessJwt,
      refreshToken: refreshJwt,
      tokenExpiry: null,
      scope: null,
      profileImage: null, // Initialize as null
      displayName: handle,
      platformUsername: handle,
      status: "active",
      errorMessage: null,
    };

    // 6. Upsert Initial SocialAccount in Database
    const updateResult = await SocialAccount.updateOne(
      { userId: userId, platform: "bluesky", platformAccountId: did },
      { $set: accountData },
      { upsert: true }
    );

    if (updateResult.acknowledged) {
      const action = updateResult.upsertedId ? "created" : "updated";
      console.log(`Bluesky account ${action} successfully for user: ${userId}`);

      // 7. Trigger async profile fetch (DO NOT await)
      fetchAndUpdateProfile(agent, did, userId);

      // 8. Return success response immediately
      return NextResponse.json(
        {
          message: `Bluesky account connected successfully for ${handle}. Profile picture fetching in background.`,
          handle: handle,
        },
        { status: 200 }
      );
    } else {
      console.error(
        "Bluesky Login Error: Database update failed to acknowledge for user:",
        userId
      );
      throw new Error(
        "Failed to save Bluesky account information to the database."
      );
    }
  } catch (error) {
    console.error("Bluesky Login Error:", error);
    // Provide specific feedback for common auth errors
    let errorMessage = "Failed to connect Bluesky account.";
    let status = 500;
    if (
      error.message?.includes("Authentication Required") ||
      error.status === 401 ||
      error.status === 400
    ) {
      errorMessage =
        "Invalid Bluesky handle or app password. Please check your credentials.";
      status = 401; // Unauthorized
    } else if (error.message?.includes("Network request failed")) {
      errorMessage =
        "Could not connect to Bluesky servers. Please try again later.";
      status = 503; // Service Unavailable
    }

    return NextResponse.json(
      { message: errorMessage, error: error.message },
      { status: status }
    );
  }
}
