import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import Stripe from "stripe";

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
    const { planId, successUrl, cancelUrl, metadata } = await request.json();

    // Validate required fields
    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 }
      );
    }

    // Plan configuration mapping to your Stripe Price IDs
    const planConfig = {
      basic: {
        name: "Basic",
        price: 5,
        priceId: process.env.STRIPE_BASIC_PRICE_ID,
      },
      pro: {
        name: "Pro",
        price: 11,
        priceId: process.env.STRIPE_PRO_PRICE_ID,
      },
      premium: {
        name: "Premium",
        price: 19,
        priceId: process.env.STRIPE_PREMIUM_PRICE_ID,
      },
    };

    const selectedPlan = planConfig[planId];
    if (!selectedPlan) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }

    if (!selectedPlan.priceId) {
      console.error("Price ID not configured for plan:", planId, selectedPlan);
      return NextResponse.json(
        { error: "Price ID not configured for this plan" },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url:
        successUrl ||
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        cancelUrl ||
        `${process.env.NEXT_PUBLIC_APP_URL}/prices?checkout=cancelled`,
      customer_email: session.user.email,
      client_reference_id: session.user.id,
      metadata: {
        userId: session.user.id,
        planId: planId,
        userEmail: session.user.email,
        ...metadata,
      },
      subscription_data: {
        trial_period_days: 14, // 14-day free trial
        metadata: {
          userId: session.user.id,
          planId: planId,
        },
      },
      // Collect billing address for tax calculation
      billing_address_collection: "required",
      // Enable customer updates
      customer_update: {
        address: "auto",
      },
      // Tax calculation
      automatic_tax: {
        enabled: true,
      },
    });

    console.log("Stripe checkout session created:", {
      sessionId: checkoutSession.id,
      planId,
      customerEmail: session.user.email,
      priceId: selectedPlan.priceId,
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
      plan: selectedPlan,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    console.error("Error details:", {
      type: error.type,
      message: error.message,
      param: error.param,
      code: error.code,
    });

    // Provide more specific error messages based on Stripe error types
    let errorMessage = "Failed to create checkout session";
    let details = error.message;

    if (error.type === "StripeCardError") {
      errorMessage = "Your card was declined";
    } else if (error.type === "StripeRateLimitError") {
      errorMessage = "Too many requests made to the API too quickly";
    } else if (error.type === "StripeInvalidRequestError") {
      errorMessage = "Invalid parameters were supplied to Stripe's API";
      details = `${error.message}${
        error.param ? ` (parameter: ${error.param})` : ""
      }`;
    } else if (error.type === "StripeAPIError") {
      errorMessage = "An error occurred internally with Stripe's API";
    } else if (error.type === "StripeConnectionError") {
      errorMessage =
        "Some kind of error occurred during the HTTPS communication";
    } else if (error.type === "StripeAuthenticationError") {
      errorMessage = "You probably used an incorrect API key";
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: details,
        type: error.type,
        param: error.param,
      },
      { status: 500 }
    );
  }
}
