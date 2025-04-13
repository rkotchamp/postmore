import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    console.log("TikTok webhook verification:", { mode, token });

    // Replace with your actual verify token from env
    const verifyToken = process.env.TIKTOK_WEBHOOK_VERIFY_TOKEN;

    if (mode === "subscribe" && token === verifyToken) {
      console.log("TikTok webhook verified successfully");
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    } else {
      console.error("TikTok webhook verification failed: Invalid token");
      return new Response("Verification Failed", { status: 403 });
    }
  } catch (error) {
    console.error("TikTok webhook verification error:", error);
    return new Response("Server Error", { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-tiktok-signature");

    if (!signature) {
      console.error("TikTok webhook: Missing signature");
      return new Response("Forbidden: Missing signature", { status: 403 });
    }

    // Verify signature
    const secretKey = process.env.TIKTOK_CLIENT_SECRET;
    const hmac = crypto.createHmac("sha1", secretKey);
    const expectedSignature = hmac.update(body).digest("hex");

    if (signature !== `sha1=${expectedSignature}`) {
      console.error("TikTok webhook: Invalid signature");
      return new Response("Forbidden: Invalid signature", { status: 403 });
    }

    // Parse the webhook data
    const webhookData = JSON.parse(body);
    console.log("TikTok webhook received:", webhookData);

    // Process webhook event based on type
    // Implementation will depend on your application needs

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("TikTok webhook processing error:", error);
    return new Response("Server Error", { status: 500 });
  }
}
