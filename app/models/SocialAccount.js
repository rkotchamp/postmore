import mongoose from "mongoose";

/**
 * Social Account Schema
 * Stores user's connected social media accounts credentials and metadata
 * This follows the User Account Management approach described in the AppOverview
 */
const SocialAccountSchema = new mongoose.Schema(
  {
    // Reference to the user who owns this account
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Platform identifier (tiktok, instagram, facebook, etc.)
    platform: {
      type: String,
      required: true,
      index: true,
    },

    // Platform's unique identifier for this account
    platformAccountId: {
      type: String,
      required: true,
      index: true,
    },

    // OAuth tokens and authentication info
    accessToken: {
      type: String,
      required: true,
    },

    refreshToken: {
      type: String,
    },

    tokenExpiry: {
      type: Date,
    },

    // Scopes granted by the user
    scope: {
      type: String,
    },

    // Display information
    displayName: {
      type: String,
    },

    platformUsername: {
      type: String,
    },

    profileImage: {
      type: String,
    },

    // Additional platform-specific data
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Status of this connection
    status: {
      type: String,
      enum: ["active", "revoked", "expired", "error"],
      default: "active",
    },

    // If there was an error, store it here
    errorMessage: {
      type: String,
    },

    // Last time this account was used
    lastUsed: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness of userId + platform + platformAccountId
SocialAccountSchema.index(
  { userId: 1, platform: 1, platformAccountId: 1 },
  { unique: true }
);

// Method to check if token is expired
SocialAccountSchema.methods.isTokenExpired = function () {
  if (!this.tokenExpiry) return true;

  // Add 5 minute buffer
  const bufferTime = 5 * 60 * 1000;
  return Date.now() > this.tokenExpiry.getTime() - bufferTime;
};

// Method to update the lastUsed timestamp
SocialAccountSchema.methods.updateLastUsed = function () {
  this.lastUsed = new Date();
  return this.save();
};

// Create model only if it doesn't already exist (for Next.js hot reloading)
const SocialAccount =
  mongoose.models.SocialAccount ||
  mongoose.model("SocialAccount", SocialAccountSchema);

export default SocialAccount;
