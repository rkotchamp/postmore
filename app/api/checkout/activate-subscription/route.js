import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import Stripe from "stripe";
import { connectToMongoose } from "@/app/lib/db/mongoose";
import User from "@/app/models/userSchema";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(request) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "subscription.items.data.price.product"],
    });

    if (!checkoutSession) {
      return NextResponse.json(
        { error: "Invalid checkout session" },
        { status: 404 }
      );
    }

    // Verify the session was completed
    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToMongoose();

    // Map Stripe price ID to internal plan ID
    const priceIdToPlanMap = {
      [process.env.STRIPE_BASIC_PRICE_ID || "price_1RkThRGR3RTuDO766eMwFnUG"]: "basic",
      [process.env.STRIPE_PRO_PRICE_ID || "price_1RkThRGR3RTuDO76jjjAXDzp"]: "pro",
      [process.env.STRIPE_PREMIUM_PRICE_ID || "price_1RkThRGR3RTuDO7663YF2ROU"]: "premium",
    };

    const subscription = checkoutSession.subscription;
    const priceId = subscription?.items?.data?.[0]?.price?.id;
    const planId = priceIdToPlanMap[priceId];

    if (!planId) {
      console.error("Unknown price ID:", priceId);
      return NextResponse.json(
        { error: "Invalid subscription plan" },
        { status: 400 }
      );
    }

    // Update user with subscription information
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      {
        subscription: {
          id: subscription.id,
          planId: planId,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          trialEnd: subscription.trial_end 
            ? new Date(subscription.trial_end * 1000) 
            : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
        stripeCustomerId: checkoutSession.customer,
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Failed to update user subscription" },
        { status: 500 }
      );
    }

    // Return subscription data
    return NextResponse.json({
      success: true,
      subscription: updatedUser.subscription,
      message: "Subscription activated successfully",
    });
  } catch (error) {
    console.error("Error activating subscription:", error);
    return NextResponse.json(
      { error: "Failed to activate subscription" },
      { status: 500 }
    );
  }
}