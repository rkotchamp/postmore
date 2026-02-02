import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import Stripe from "stripe";

// Validate Stripe secret key
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY environment variable is not set");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(request) {
  try {
    // Parse request body first to check metadata
    const body = await request.json();
    const { planId, billingPeriod = "monthly", successUrl, cancelUrl, metadata } = body;

    // Get the current session
    const session = await getServerSession(authOptions);

    // Only require authentication for profile page upgrades
    const isProfileUpgrade = metadata?.source === "profile_upgrade";
    
    if (isProfileUpgrade && (!session || !session.user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate required fields
    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 }
      );
    }


    // Plan configuration mapping to Stripe Price IDs (from environment variables)
    const planConfig = {
      basic: {
        name: "Basic",
        monthlyPriceId: process.env.STRIPE_MONTHLY_BASIC_PRICE_ID,
        yearlyPriceId: process.env.STRIPE_YEARLY_BASIC_PRICE_ID,
      },
      creator: {
        name: "Creator",
        monthlyPriceId: process.env.STRIPE_MONTHLY_CREATOR_PRICE_ID,
        yearlyPriceId: process.env.STRIPE_YEARLY_CREATOR_PRICE_ID,
      },
      premium: {
        name: "Premium",
        monthlyPriceId: process.env.STRIPE_MONTHLY_PREMIUM_PRICE_ID,
        yearlyPriceId: process.env.STRIPE_YEARLY_PREMIUM_PRICE_ID,
      },
    };

    const selectedPlan = planConfig[planId];
    if (!selectedPlan) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }

    // Select price based on billing period
    const selectedPriceId = billingPeriod === "yearly"
      ? selectedPlan.yearlyPriceId
      : selectedPlan.monthlyPriceId;

    if (!selectedPriceId) {
      return NextResponse.json(
        { error: "Price ID not configured for this plan" },
        { status: 500 }
      );
    }


    // Check if this is a trial signup
    const isTrial = metadata?.source === "trial";

    // Create Stripe checkout session configuration
    const checkoutConfig = {
      payment_method_types: ["card"],
      line_items: [
        {
          price: selectedPriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url:
        successUrl ||
        `${
          process.env.NEXT_PUBLIC_APP_URL || "https://www.postmoo.re"
        }/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        cancelUrl ||
        `${
          process.env.NEXT_PUBLIC_APP_URL || "https://www.postmoo.re"
        }/prices?checkout=cancelled`,
    };

    // Add 5-day free trial for trial signups
    if (isTrial) {
      checkoutConfig.subscription_data = {
        trial_period_days: 5,
      };
    }

    // Add user info if authenticated
    if (session?.user) {
      checkoutConfig.customer_email = session.user.email;
      checkoutConfig.client_reference_id = session.user.id;
    }

    const checkoutSession = await stripe.checkout.sessions.create(checkoutConfig);

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
      planId: planId,
      priceId: selectedPriceId,
    });
  } catch (error) {
    // Log error without sensitive details
    console.error("Checkout session creation failed");

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
