import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Define the user schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  fullName: {
    // Add this field as an alias for compatibility
    type: String,
    get: function () {
      return this.name;
    },
    set: function (val) {
      this.name = val;
      return val;
    },
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please provide a valid email",
    ],
  },
  password: {
    type: String,
    required: function () {
      // Password is only required for email authentication
      return this.authProvider === "email";
    },
    minlength: 8,
    select: false, // Don't return password by default in queries
  },
  authProvider: {
    type: String,
    enum: ["email", "google", "github"],
    default: "email",
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allow null/undefined values
  },
  githubId: {
    type: String,
    unique: true,
    sparse: true, // Allow null/undefined values
  },
  image: {
    type: String,
    default: null,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  socialAccounts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SocialAccount",
    },
  ],
  platformConsentAcknowledged: {
    type: Map,
    of: Boolean,
    default: {},
  },
  // Stripe subscription data
  subscription: {
    id: String, // Stripe subscription ID
    planId: {
      type: String,
      enum: ["basic", "creator", "premium"],
    },
    status: {
      type: String,
      enum: ["active", "trialing", "past_due", "cancelled", "incomplete"],
    },
    currentPeriodEnd: Date,
    trialEnd: Date,
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    trialEndingSoon: {
      type: Boolean,
      default: false,
    },
  },
  stripeCustomerId: String, // Stripe customer ID
  // Acquisition tracking for analytics
  acquisition: {
    source: {
      type: String,
      enum: ["trial", "upgrade", "profile_upgrade", "direct", "referral"],
      default: "direct",
    },
    initialPlan: {
      type: String,
      enum: ["basic", "creator", "premium"],
    },
    signupDate: {
      type: Date,
      default: Date.now,
    },
    firstPurchaseDate: Date,
    referralCode: String,
  },
  settings: {
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
    plan: {
      type: String,
      enum: ["basic", "creator", "premium"],
      default: "basic",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "trialing", "past_due", "cancelled", "incomplete"],
      default: "trialing", // Default to trial for new users
    },
    lastPaymentDate: Date,
    scheduledPostsView: {
      type: String,
      enum: ["grid", "grouped"],
      default: "grid", // Default to grid view (individual posts)
    },
    clipper: {
      defaultTemplate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Template",
        default: null, // null = use system default template
      },
      autoGeneration: {
        type: Boolean,
        default: false, // Manual clip selection by default
      },
      exportFormat: {
        type: String,
        enum: ["mp4", "mov"],
        default: "mp4",
      },
      exportQuality: {
        type: String,
        enum: ["720p", "1080p"],
        default: "1080p",
      },
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving to database
userSchema.pre("save", async function (next) {
  // Only hash the password if it's been modified (or is new) and it exists
  if (!this.isModified("password") || !this.password) return next();

  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    // Hash password with salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check if password is correct
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if model already exists to prevent overwrite during hot reloading
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
