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

      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(event.data.object);
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

    // Try multiple ways to find the user
    let user = null;
    const planId = session.metadata?.planId;

    // 1. Try client_reference_id (set for authenticated users)
    if (session.client_reference_id) {
      user = await User.findById(session.client_reference_id);
    }

    // 2. Fallback: Find by email
    if (!user && session.customer_email) {
      user = await User.findOne({ email: session.customer_email.toLowerCase() });
    }

    // 3. Fallback: Find by Stripe customer ID (if they've purchased before)
    if (!user && session.customer) {
      user = await User.findOne({ stripeCustomerId: session.customer });
    }

    if (!user) {
      console.error("No user found for checkout session:", {
        client_reference_id: session.client_reference_id,
        customer_email: session.customer_email,
        customer: session.customer,
      });
      return;
    }

    console.log(`Found user ${user._id} for checkout session`);

    // Retrieve the subscription from Stripe
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription
      );

      // Update subscription metadata with userId for future webhook events
      await stripe.subscriptions.update(session.subscription, {
        metadata: { userId: user._id.toString() },
      });

      await updateUserSubscription(user._id.toString(), subscription, planId);
    }

    // Update stripeCustomerId if not set
    if (!user.stripeCustomerId && session.customer) {
      await User.findByIdAndUpdate(user._id, {
        stripeCustomerId: session.customer,
      });
    }
  } catch (error) {
    console.error("Error handling checkout session completed:", error);
  }
}

async function handleSubscriptionCreated(subscription) {
  try {
    console.log("Processing subscription created:", subscription.id);

    const user = await findUserBySubscription(subscription);
    if (!user) {
      console.log("No user found for subscription created - will be handled by checkout.session.completed");
      return;
    }

    const planId = subscription.metadata?.planId;
    await updateUserSubscription(user._id.toString(), subscription, planId);
  } catch (error) {
    console.error("Error handling subscription created:", error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    console.log("Processing subscription updated:", subscription.id);

    const user = await findUserBySubscription(subscription);
    if (!user) {
      console.error("No user found for subscription updated:", subscription.id);
      return;
    }

    const planId = subscription.metadata?.planId;
    await updateUserSubscription(user._id.toString(), subscription, planId);
  } catch (error) {
    console.error("Error handling subscription updated:", error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    console.log("Processing subscription deleted:", subscription.id);

    const user = await findUserBySubscription(subscription);
    if (!user) {
      console.error("No user found for subscription deleted:", subscription.id);
      return;
    }

    await User.findByIdAndUpdate(user._id, {
      $set: {
        "subscription.status": "cancelled",
        "subscription.cancelAtPeriodEnd": true,
        "settings.subscriptionStatus": "cancelled",
        updatedAt: new Date(),
      },
    });

    console.log(`Subscription cancelled for user ${user._id}`);
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

      const user = await findUserBySubscription(subscription);
      if (!user) {
        console.error("No user found for invoice payment succeeded:", invoice.id);
        return;
      }

      // Only update to active if not in trial (trial invoices are $0)
      // Use the actual subscription status from Stripe
      const status = subscription.status === "trialing" ? "trialing" : "active";

      await User.findByIdAndUpdate(user._id, {
        $set: {
          "subscription.status": status,
          "settings.subscriptionStatus": status,
          "settings.lastPaymentDate": new Date(invoice.created * 1000),
          updatedAt: new Date(),
        },
      });

      console.log(`Payment succeeded for user ${user._id}, status: ${status}`);
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

      const user = await findUserBySubscription(subscription);
      if (!user) {
        console.error("No user found for invoice payment failed:", invoice.id);
        return;
      }

      await User.findByIdAndUpdate(user._id, {
        $set: {
          "subscription.status": "past_due",
          "settings.subscriptionStatus": "past_due",
          updatedAt: new Date(),
        },
      });

      console.log(`Payment failed for user ${user._id}`);
    }
  } catch (error) {
    console.error("Error handling invoice payment failed:", error);
  }
}

async function handleTrialWillEnd(subscription) {
  try {
    console.log("Processing trial will end:", subscription.id);

    const user = await findUserBySubscription(subscription);
    if (!user) {
      console.error("No user found for trial will end:", subscription.id);
      return;
    }

    const trialEndDate = new Date(subscription.trial_end * 1000);

    // TODO: Send email notification to user about trial ending
    // You can integrate with your email service here (e.g., nodemailer, SendGrid)
    console.log(`Trial ending soon for user ${user._id} (${user.email}), ends: ${trialEndDate.toISOString()}`);

    // Optionally update a flag in the user record
    await User.findByIdAndUpdate(user._id, {
      $set: {
        "subscription.trialEndingSoon": true,
        updatedAt: new Date(),
      },
    });

    // Example email integration:
    // await sendTrialEndingEmail({
    //   email: user.email,
    //   name: user.name,
    //   trialEndDate,
    //   planName: subscription.items.data[0]?.price?.nickname || "your plan",
    // });

  } catch (error) {
    console.error("Error handling trial will end:", error);
  }
}

// Helper function to find user by subscription (via metadata or stripeCustomerId)
async function findUserBySubscription(subscription) {
  // 1. Try metadata userId (set by checkout.session.completed)
  if (subscription.metadata?.userId) {
    const user = await User.findById(subscription.metadata.userId);
    if (user) return user;
  }

  // 2. Fallback: Find by stripeCustomerId
  if (subscription.customer) {
    const user = await User.findOne({ stripeCustomerId: subscription.customer });
    if (user) return user;
  }

  // 3. Fallback: Find by subscription ID
  const user = await User.findOne({ "subscription.id": subscription.id });
  if (user) return user;

  return null;
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
  // Map Stripe price IDs back to plan IDs (supports both monthly and yearly)
  const priceMap = {
    [process.env.STRIPE_MONTHLY_BASIC_PRICE_ID]: "basic",
    [process.env.STRIPE_YEARLY_BASIC_PRICE_ID]: "basic",
    [process.env.STRIPE_MONTHLY_CREATOR_PRICE_ID]: "creator",
    [process.env.STRIPE_YEARLY_CREATOR_PRICE_ID]: "creator",
    [process.env.STRIPE_MONTHLY_PREMIUM_PRICE_ID]: "premium",
    [process.env.STRIPE_YEARLY_PREMIUM_PRICE_ID]: "premium",
  };

  return priceMap[priceId] || "basic";
}
