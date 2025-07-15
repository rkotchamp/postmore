import { NextResponse } from "next/server";
import Stripe from "stripe";
import { connectToDatabase } from "@/app/lib/db/mongodb";
import User from "@/app/models/userSchema";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

// This should be set as an environment variable
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  try {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    let event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed:`, err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    console.log(`Received Stripe webhook: ${event.type}`);

    // Connect to database
    await connectToDatabase();

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Error processing webhook" },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session) {
  try {
    console.log("Processing checkout session completed:", session.id);

    const userId = session.client_reference_id || session.metadata?.userId;
    const planId = session.metadata?.planId;

    if (!userId) {
      console.error("No user ID found in checkout session");
      return;
    }

    // Retrieve the subscription from Stripe
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription
      );
      await updateUserSubscription(userId, subscription, planId);
    }
  } catch (error) {
    console.error("Error handling checkout session completed:", error);
  }
}

async function handleSubscriptionCreated(subscription) {
  try {
    console.log("Processing subscription created:", subscription.id);

    const userId = subscription.metadata?.userId;
    const planId = subscription.metadata?.planId;

    if (userId) {
      await updateUserSubscription(userId, subscription, planId);
    }
  } catch (error) {
    console.error("Error handling subscription created:", error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    console.log("Processing subscription updated:", subscription.id);

    const userId = subscription.metadata?.userId;
    const planId = subscription.metadata?.planId;

    if (userId) {
      await updateUserSubscription(userId, subscription, planId);
    }
  } catch (error) {
    console.error("Error handling subscription updated:", error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    console.log("Processing subscription deleted:", subscription.id);

    const userId = subscription.metadata?.userId;

    if (userId) {
      await User.findByIdAndUpdate(userId, {
        $unset: {
          subscription: 1,
          stripeCustomerId: 1,
          "settings.plan": 1,
        },
        $set: {
          "settings.subscriptionStatus": "cancelled",
          updatedAt: new Date(),
        },
      });

      console.log(`Subscription cancelled for user ${userId}`);
    }
  } catch (error) {
    console.error("Error handling subscription deleted:", error);
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  try {
    console.log("Processing invoice payment succeeded:", invoice.id);

    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription
      );
      const userId = subscription.metadata?.userId;

      if (userId) {
        await User.findByIdAndUpdate(userId, {
          $set: {
            "settings.subscriptionStatus": "active",
            "settings.lastPaymentDate": new Date(invoice.created * 1000),
            updatedAt: new Date(),
          },
        });

        console.log(`Payment succeeded for user ${userId}`);
      }
    }
  } catch (error) {
    console.error("Error handling invoice payment succeeded:", error);
  }
}

async function handleInvoicePaymentFailed(invoice) {
  try {
    console.log("Processing invoice payment failed:", invoice.id);

    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        invoice.subscription
      );
      const userId = subscription.metadata?.userId;

      if (userId) {
        await User.findByIdAndUpdate(userId, {
          $set: {
            "settings.subscriptionStatus": "past_due",
            updatedAt: new Date(),
          },
        });

        console.log(`Payment failed for user ${userId}`);
      }
    }
  } catch (error) {
    console.error("Error handling invoice payment failed:", error);
  }
}

async function updateUserSubscription(userId, subscription, planId) {
  try {
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

    const subscriptionData = {
      id: subscription.id,
      planId:
        planId || getPlanIdFromPriceId(subscription.items.data[0]?.price?.id),
      status: statusMap[subscription.status] || subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };

    await User.findByIdAndUpdate(userId, {
      $set: {
        subscription: subscriptionData,
        stripeCustomerId: subscription.customer,
        "settings.plan": subscriptionData.planId,
        "settings.subscriptionStatus": subscriptionData.status,
        updatedAt: new Date(),
      },
    });

    console.log(`Updated subscription for user ${userId}:`, subscriptionData);
  } catch (error) {
    console.error("Error updating user subscription:", error);
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
