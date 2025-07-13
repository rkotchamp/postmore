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

    const { customerId, returnUrl } = await request.json();

    // If customerId is not provided, we need to find the customer by email
    let customerToUse = customerId;

    if (!customerToUse) {
      // Search for customer by email
      const customers = await stripe.customers.list({
        email: session.user.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerToUse = customers.data[0].id;
      } else {
        // No customer found, they might not have a subscription yet
        return NextResponse.json(
          { error: "No subscription found. Please subscribe first." },
          { status: 404 }
        );
      }
    }

    // Create customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerToUse,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    console.log("Customer portal session created:", {
      sessionId: portalSession.id,
      customerId: customerToUse,
      userEmail: session.user.email,
    });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error("Error creating customer portal session:", error);

    // Provide specific error messages
    let errorMessage = "Failed to create customer portal session";
    if (error.type === "StripeInvalidRequestError") {
      errorMessage = "Invalid request. Please contact support.";
    } else if (error.type === "StripeAuthenticationError") {
      errorMessage = "Authentication error. Please contact support.";
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
