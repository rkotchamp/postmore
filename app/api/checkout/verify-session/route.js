import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import Stripe from "stripe";
import { connectToDatabase } from "@/app/lib/db/mongodb";
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

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    // Verify this session belongs to the current user
    if (
      checkoutSession.client_reference_id !== session.user.id &&
      checkoutSession.customer_email !== session.user.email
    ) {
      return NextResponse.json(
        { error: "Session does not belong to current user" },
        { status: 403 }
      );
    }

    // Connect to database
    await connectToDatabase();

    let subscriptionData = null;

    if (checkoutSession.subscription) {
      const subscription = checkoutSession.subscription;
      const planId = getPlanIdFromPriceId(
        subscription.items.data[0]?.price?.id
      );

      // Map Stripe subscription status to our status
      const statusMap = {
        active: "active",
        trialing: "trialing",
        past_due: "past_due",
        canceled: "cancelled",
        unpaid: "past_due",
        incomplete: "incomplete",
        incomplete_expired: "incomplete",
      };

      subscriptionData = {
        id: subscription.id,
        planId: planId,
        status: statusMap[subscription.status] || subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialEnd: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };

      // Update user record in database
      await User.findByIdAndUpdate(session.user.id, {
        $set: {
          subscription: subscriptionData,
          stripeCustomerId: checkoutSession.customer.id,
          "settings.plan": planId,
          "settings.subscriptionStatus": subscriptionData.status,
          updatedAt: new Date(),
        },
      });

      console.log(
        `Verified and updated subscription for user ${session.user.id}:`,
        subscriptionData
      );
    }

    return NextResponse.json({
      success: true,
      subscription: subscriptionData,
      checkoutSession: {
        id: checkoutSession.id,
        paymentStatus: checkoutSession.payment_status,
        customerEmail: checkoutSession.customer_email,
      },
    });
  } catch (error) {
    console.error("Error verifying checkout session:", error);

    // Provide specific error messages
    let errorMessage = "Failed to verify checkout session";
    if (error.type === "StripeInvalidRequestError") {
      errorMessage = "Invalid checkout session";
    } else if (error.type === "StripeAuthenticationError") {
      errorMessage = "Authentication error with payment provider";
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

function getPlanIdFromPriceId(priceId) {
  // Map Stripe price IDs back to plan IDs
  const priceMap = {
    [process.env.STRIPE_BASIC_PRICE_ID]: "basic",
    [process.env.STRIPE_PRO_PRICE_ID]: "pro",
    [process.env.STRIPE_PREMIUM_PRICE_ID]: "premium",
  };

  return priceMap[priceId] || "basic";
}
