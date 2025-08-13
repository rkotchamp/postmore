import mongoose from "mongoose";

/**
 * Clipper Usage Schema
 * Tracks user usage of Clipper Studio features for billing and limits
 * Monthly tracking for subscription plan enforcement
 */
const ClipperUsageSchema = new mongoose.Schema(
  {
    // Reference to the user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Tracking period
    month: {
      type: Number, // 1-12
      required: true,
    },

    year: {
      type: Number, // 2024, 2025, etc.
      required: true,
    },

    // Usage counters
    videosProcessed: {
      type: Number,
      default: 0,
      min: 0,
    },

    clipsGenerated: {
      type: Number,
      default: 0,
      min: 0,
    },

    storageUsed: {
      type: Number, // in MB
      default: 0,
      min: 0,
    },

    // Tracking timestamp
    lastUpdated: {
      type: Date,
      default: Date.now,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  }
);

// Compound index to ensure one record per user per month
ClipperUsageSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

// Index for cleanup and reporting
ClipperUsageSchema.index({ year: 1, month: 1 });

// Static method to get or create current month usage
ClipperUsageSchema.statics.getCurrentMonthUsage = async function(userId) {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  let usage = await this.findOne({ userId, month, year });
  
  if (!usage) {
    usage = await this.create({ userId, month, year });
  }
  
  return usage;
};

// Method to increment video processing count
ClipperUsageSchema.methods.incrementVideosProcessed = function() {
  this.videosProcessed += 1;
  this.lastUpdated = new Date();
  return this.save();
};

// Method to increment clips generated
ClipperUsageSchema.methods.incrementClipsGenerated = function(count = 1) {
  this.clipsGenerated += count;
  this.lastUpdated = new Date();
  return this.save();
};

// Method to update storage usage
ClipperUsageSchema.methods.updateStorageUsed = function(sizeMB) {
  this.storageUsed += sizeMB;
  this.lastUpdated = new Date();
  return this.save();
};

// Method to check if user has exceeded limits based on plan
ClipperUsageSchema.methods.checkLimits = function(userPlan) {
  const limits = {
    basic: { videos: 5, clips: 25, storage: 1000 }, // 1GB
    pro: { videos: 50, clips: 250, storage: 10000 }, // 10GB
    premium: { videos: -1, clips: -1, storage: 50000 }, // 50GB, unlimited videos/clips
  };

  const planLimits = limits[userPlan] || limits.basic;
  
  return {
    videosExceeded: planLimits.videos !== -1 && this.videosProcessed >= planLimits.videos,
    clipsExceeded: planLimits.clips !== -1 && this.clipsGenerated >= planLimits.clips,
    storageExceeded: this.storageUsed >= planLimits.storage,
    limits: planLimits,
    usage: {
      videos: this.videosProcessed,
      clips: this.clipsGenerated,
      storage: this.storageUsed,
    },
  };
};

// Static method to get usage statistics for admin
ClipperUsageSchema.statics.getMonthlyStats = function(year, month) {
  return this.aggregate([
    { $match: { year, month } },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        totalVideosProcessed: { $sum: "$videosProcessed" },
        totalClipsGenerated: { $sum: "$clipsGenerated" },
        totalStorageUsed: { $sum: "$storageUsed" },
        avgVideosPerUser: { $avg: "$videosProcessed" },
        avgClipsPerUser: { $avg: "$clipsGenerated" },
        avgStoragePerUser: { $avg: "$storageUsed" },
      },
    },
  ]);
};

// Create model only if it doesn't already exist (for Next.js hot reloading)
const ClipperUsage =
  mongoose.models.ClipperUsage ||
  mongoose.model("ClipperUsage", ClipperUsageSchema);

export default ClipperUsage;