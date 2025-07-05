const mongoose = require("mongoose");
const { Schema } = mongoose;

// Media schema for handling uploaded files
const MediaSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["image", "video", "gif"],
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  path: String,
  thumbnail: String,
  width: Number,
  height: Number,
  duration: Number, // For videos
  size: Number,
  mimeType: String,
});

// Account schema for tracking where content is posted
const AccountSchema = new Schema({
  id: {
    type: String,
    required: true,
  },
  name: String,
  email: String,
  type: {
    type: String,
    enum: [
      "twitter",
      "facebook",
      "instagram",
      "bluesky",
      "linkedin",
      "ytshorts",
      "tiktok",
    ],
    required: true,
  },
  platformId: String,
});

// Platform-specific caption mapping
const CaptionsSchema = new Schema({
  mode: {
    type: String,
    enum: ["single", "multiple"],
    default: "single",
  },
  single: String,
  multiple: {
    type: Map,
    of: String,
  },
});

// Schedule information
const ScheduleSchema = new Schema({
  type: {
    type: String,
    enum: ["now", "scheduled", "draft"],
    default: "now",
  },
  at: Date,
});

// Platform-specific result tracking
const ResultSchema = new Schema({
  platform: String,
  accountId: String,
  success: Boolean,
  postId: String,
  url: String,
  error: String,
  nativeScheduling: {
    type: Boolean,
    default: false,
  },
  scheduledTime: Date,
  // YouTube-specific fields
  youtubeData: {
    videoId: String,
    status: {
      type: String,
      enum: ["uploaded", "scheduled", "published", "failed", "processing"],
    },
    thumbnail: String,
    aspectRatio: Number,
    duration: Number,
    publishAt: Date,
    privacyStatus: {
      type: String,
      enum: ["public", "private", "unlisted"],
      default: "public",
    },
  },
  // TikTok-specific fields
  tiktokData: {
    publishId: String,
    status: {
      type: String,
      enum: ["processing", "published", "failed", "scheduled"],
    },
    shareUrl: String,
    videoId: String,
    mediaType: {
      type: String,
      enum: ["VIDEO", "PHOTO"],
    },
    privacyLevel: String,
    publishAt: Date,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Post schema definition
const PostSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    contentType: {
      type: String,
      enum: ["text", "media", "link"],
      required: true,
    },
    text: {
      type: String,
      default: "",
    },
    media: [MediaSchema],
    accounts: [AccountSchema],
    captions: CaptionsSchema,
    schedule: ScheduleSchema,
    status: {
      type: String,
      enum: ["pending", "scheduled", "published", "failed", "draft"],
      default: "pending",
    },
    results: [ResultSchema],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Add method to fetch posts for a specific user
PostSchema.statics.findByUserId = function (userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Add method to fetch scheduled posts
PostSchema.statics.findScheduled = function () {
  return this.find({
    "schedule.type": "scheduled",
    "schedule.at": { $gt: new Date() },
    status: "scheduled",
  }).sort({ "schedule.at": 1 });
};

module.exports = mongoose.models.Post || mongoose.model("Post", PostSchema);
