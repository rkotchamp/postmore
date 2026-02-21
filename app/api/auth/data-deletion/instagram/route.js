import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToMongoose } from "@/app/lib/db/mongoose";
import SocialAccount from "@/app/models/SocialAccount";

const APP_SECRET = process.env.META_APP_SECRET;
const APP_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;

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
 * POST /api/auth/data-deletion/instagram
 *
 * Called by Meta when a user requests deletion of their data.
 * Must respond with { url, confirmation_code } so Meta can show the user
 * where to verify deletion status.
 *
 * Response format required by Meta:
 * { "url": "https://...", "confirmation_code": "<unique-id>" }
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

    // Delete all SocialAccount records for this Instagram user
    await SocialAccount.deleteMany({
      platform: "instagram",
      platformAccountId: instagramUserId,
    });

    console.log(`[Instagram Data Deletion] Deleted data for: ${instagramUserId}`);

    // Unique confirmation code so Meta/users can reference this deletion
    const confirmationCode = `ig_del_${instagramUserId}_${Date.now()}`;

    // Return the required Meta response
    return NextResponse.json(
      {
        url: `${APP_URL}/data-deletion?code=${confirmationCode}`,
        confirmation_code: confirmationCode,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Instagram Data Deletion] Error:", error.message);
    return NextResponse.json({ error: "Data deletion failed" }, { status: 500 });
  }
}
