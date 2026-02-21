import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToMongoose } from "@/app/lib/db/mongoose";
import SocialAccount from "@/app/models/SocialAccount";

const APP_SECRET = process.env.META_APP_SECRET;

/**
 * Parse and verify a Meta signed_request.
 * Returns the decoded payload, or throws if the signature is invalid.
 */
function parseSignedRequest(signedRequest) {
  const [encodedSig, payload] = signedRequest.split(".");

  const sig = Buffer.from(encodedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const expectedSig = crypto
    .createHmac("sha256", APP_SECRET)
    .update(payload)
    .digest();

  if (!crypto.timingSafeEqual(sig, expectedSig)) {
    throw new Error("Invalid signed_request signature");
  }

  const data = JSON.parse(
    Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
  );

  return data;
}

/**
 * POST /api/auth/deauthorize/instagram
 *
 * Called by Meta when a user removes your app from their Instagram account.
 * Marks their Instagram SocialAccount as revoked in the database.
 */
export async function POST(request) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const signedRequest = params.get("signed_request");

    if (!signedRequest) {
      return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
    }

    const data = parseSignedRequest(signedRequest);
    const instagramUserId = data.user_id;

    if (!instagramUserId) {
      return NextResponse.json({ error: "Missing user_id in payload" }, { status: 400 });
    }

    await connectToMongoose();

    // Mark the account as revoked rather than deleting it outright,
    // so we have a record that the user disconnected.
    await SocialAccount.updateMany(
      { platform: "instagram", platformAccountId: instagramUserId },
      { $set: { status: "revoked", accessToken: "", refreshToken: "" } }
    );

    console.log(`[Instagram Deauthorize] Revoked account: ${instagramUserId}`);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[Instagram Deauthorize] Error:", error.message);
    return NextResponse.json({ error: "Deauthorize failed" }, { status: 500 });
  }
}
