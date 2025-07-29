import { NextResponse } from "next/server";

/**
 * Instagram Webhook Handler
 * Handles Instagram webhook verification and events
 */

export async function GET(request) {
  // Handle webhook verification
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN;

  console.log("Instagram webhook verification attempt:", {
    mode,
    token: token ? "present" : "missing",
    challenge: challenge ? "present" : "missing",
  });

  if (mode === "subscribe" && token === verifyToken) {
    console.log("Instagram webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  } else {
    console.error("Instagram webhook verification failed:", {
      expectedToken: verifyToken ? "configured" : "missing",
      receivedToken: token,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function POST(request) {
  // Handle webhook events
  try {
    const body = await request.json();
    console.log("Instagram webhook event received:", JSON.stringify(body, null, 2));

    // Process webhook events here
    if (body.object === "instagram") {
      for (const entry of body.entry || []) {
        // Handle different types of changes
        for (const change of entry.changes || []) {
          console.log("Instagram webhook change:", {
            field: change.field,
            value: change.value,
          });

          // Handle specific webhook events
          switch (change.field) {
            case "comments":
              // Handle comment events
              console.log("Instagram comment event:", change.value);
              break;
            case "mentions":
              // Handle mention events
              console.log("Instagram mention event:", change.value);
              break;
            case "story_insights":
              // Handle story insights
              console.log("Instagram story insights:", change.value);
              break;
            default:
              console.log("Unhandled Instagram webhook field:", change.field);
          }
        }
      }
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error) {
    console.error("Instagram webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}