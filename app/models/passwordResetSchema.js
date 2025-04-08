import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      default: "", // Store the user's name for personalized emails without querying User collection
    },
    token: {
      type: String,
      required: true,
    },
    expires: {
      type: Date,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: "password-resets" } // Explicitly set collection name
);

// Create compound indexes to improve query performance and security
passwordResetSchema.index({ email: 1, token: 1 });
passwordResetSchema.index({ email: 1, createdAt: -1 });

// Add TTL index only for documents with an expires date in the past
// This ensures we clean up old reset tokens but keep permanent entries
passwordResetSchema.index(
  { expires: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: {
      used: false, // Only delete tokens that aren't used yet
    },
  }
);

// Static method to check if rate limit has been reached
passwordResetSchema.statics.isRateLimited = async function (email) {
  const oneHour = new Date(Date.now() - 60 * 60 * 1000);
  const count = await this.countDocuments({
    email,
    used: false, // Only count actual reset attempts, not placeholder entries
    createdAt: { $gt: oneHour },
  });

  // Limit to 3 reset attempts per hour
  return count >= 3;
};

const PasswordReset =
  mongoose.models.PasswordReset ||
  mongoose.model("PasswordReset", passwordResetSchema);

export default PasswordReset;
