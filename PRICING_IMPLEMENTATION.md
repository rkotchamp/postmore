# Pricing System Implementation

This document outlines the pricing system implementation for the PostMore application, including the pricing page, state management, and Stripe integration preparation.

## 🎯 Overview

The pricing system includes:

- **Pricing Page** (`/prices`) - Beautiful pricing cards with plan comparison
- **Zustand Store** - State management for subscriptions and plans
- **Stripe Integration Hook** - Ready for Stripe checkout integration
- **API Endpoints** - Backend support for checkout sessions

## 📁 File Structure

```
app/
├── prices/
│   └── page.jsx                     # Main pricing page
├── lib/store/
│   └── subscriptionStore.js         # Zustand store for subscription state
├── hooks/
│   └── useStripeCheckout.js         # Custom hook for Stripe integration
├── api/checkout/
│   └── create-session/
│       └── route.js                 # API endpoint for checkout sessions
└── models/
    └── userSchema.js                # User model with settings field
```

## 🎨 Features

### Pricing Page (`/prices`)

- **Responsive Design** - Works on all devices
- **Dark/Light Theme** - Consistent with app theme
- **Plan Comparison** - Clear feature comparison
- **Current Plan Display** - Shows user's current subscription
- **Upgrade/Downgrade Logic** - Smart button text based on current plan
- **Loading States** - Smooth user experience during checkout
- **Error Handling** - User-friendly error messages

### State Management

- **Zustand Store** - Centralized subscription state
- **Persistent Storage** - Saves plan selection across sessions
- **Computed Properties** - Smart upgrade/downgrade logic
- **Error Handling** - Centralized error management

### Stripe Integration Ready

- **Checkout Hook** - Abstracted Stripe checkout logic
- **Session Management** - Handles success/failure states
- **Customer Portal** - Ready for subscription management
- **Webhook Support** - Prepared for Stripe webhooks

## 🚀 Usage

### Accessing the Pricing Page

Navigate to `/prices` to see the pricing page with all available plans.

### Plan Configuration

Plans are defined in `subscriptionStore.js`:

```javascript
const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 19,
    features: [...],
    limits: { accounts: 3, posts: 30, users: 1 }
  },
  // ... more plans
];
```

### Using the Subscription Store

```javascript
import { useSubscriptionStore } from "@/app/lib/store/subscriptionStore";

const {
  plans,
  selectedPlan,
  currentSubscription,
  selectPlan,
  canUpgrade,
  canDowngrade,
} = useSubscriptionStore();
```

### Using the Stripe Checkout Hook

```javascript
import { useStripeCheckout } from "@/app/hooks/useStripeCheckout";

const { initiateCheckout, isRedirecting } = useStripeCheckout();

const handlePlanSelect = (planId) => {
  initiateCheckout(planId, {
    successUrl: "/dashboard?checkout=success",
    cancelUrl: "/prices?checkout=cancelled",
    metadata: { source: "pricing_page" },
  });
};
```

## 🔧 Stripe Integration

### Current Status

- ✅ **UI Components** - Pricing page and checkout flow
- ✅ **State Management** - Zustand store for subscriptions
- ✅ **API Structure** - Endpoint stubs for checkout sessions
- ⏳ **Stripe Integration** - Ready for implementation

### To Complete Stripe Integration:

1. **Install Stripe**

   ```bash
   npm install stripe
   ```

2. **Environment Variables**

   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

3. **Update API Endpoint**
   Replace the stub in `app/api/checkout/create-session/route.js` with actual Stripe code:

   ```javascript
   const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

   const session = await stripe.checkout.sessions.create({
     payment_method_types: ["card"],
     line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
     mode: "subscription",
     success_url: successUrl,
     cancel_url: cancelUrl,
     customer_email: session.user.email,
     subscription_data: { trial_period_days: 14 },
   });
   ```

4. **Create Stripe Products**

   - Create products in Stripe Dashboard
   - Update `priceId` values in the API endpoint
   - Match plan IDs with Stripe price IDs

5. **Set up Webhooks**
   - Configure webhook endpoints
   - Handle subscription events
   - Update user subscription status

## 🎨 Customization

### Adding New Plans

1. Add plan to `subscriptionStore.js`
2. Update API endpoint plan configuration
3. Create corresponding Stripe product/price

### Modifying Features

Update the `features` array in plan configuration:

```javascript
features: ["Feature 1", "Feature 2", "Custom feature"];
```

### Styling

The pricing page uses Tailwind CSS and follows the app's design system. Modify classes in `app/prices/page.jsx` to customize appearance.

## 📊 Current Plan Detection

The system can detect and display a user's current plan:

- Shows "Current Plan" badge
- Disables current plan button
- Shows upgrade/downgrade options
- Displays current plan name

## 🔄 Theme Integration

The pricing page integrates with the app's theme system:

- Syncs with user's theme preference
- Stored in database via user settings
- Consistent dark/light mode experience

## 🛠️ Testing

### Demo Mode

Currently in demo mode with mock Stripe checkout. Features:

- Shows toast notifications
- Simulates checkout process
- Logs would-be API calls
- Safe for development testing

### Production Checklist

- [ ] Replace mock API with real Stripe integration
- [ ] Set up Stripe webhooks
- [ ] Configure environment variables
- [ ] Test payment flows
- [ ] Set up error monitoring
- [ ] Configure subscription management

## 🎯 Next Steps

1. **Stripe Setup** - Complete the Stripe integration
2. **Webhook Handling** - Process subscription events
3. **User Dashboard** - Show subscription status
4. **Billing Portal** - Customer self-service
5. **Analytics** - Track conversion metrics

## 📞 Support

For questions about the pricing implementation:

- Check the code comments for detailed explanations
- Review the Zustand store for state management logic
- Examine the API endpoints for backend integration
- Test the demo mode before Stripe integration

---

_This pricing system is designed to be production-ready with minimal additional configuration once Stripe is properly integrated._
