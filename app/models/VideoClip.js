import mongoose from "mongoose";

/**
 * Video Clip Schema
 * Stores individual short-form clips generated from VideoProject
 * Each clip is a 30-60 second segment with template applied
 */
const VideoClipSchema = new mongoose.Schema({
  // Reference to the parent video project
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VideoProject",
    required: true,
    index: true,
  },

  // Reference to the user who owns this clip
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  // AI-generated title from segment content analysis
  title: {
    type: String,
    required: true,
    trim: true,
  },

  // Clip timing within original video
  startTime: {
    type: Number, // seconds
    required: true,
  },

  endTime: {
    type: Number, // seconds
    required: true,
  },

  duration: {
    type: Number, // calculated: endTime - startTime
    required: true,
  },

  // Template applied to this clip
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Template",
    default: null, // null = default plain template
  },

  // Generated video file information
  generatedVideo: {
    path: String,
    url: String,
    format: String,
    resolution: String,
    size: Number,
  },

  // Virality score from AI analysis (0-100)
  viralityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  // AI analysis metadata
  aiAnalysis: {
    source: String, // 'deepseek-v3', 'manual', etc.
    reason: String, // Why this moment was selected
    engagementType: String, // 'reaction', 'educational', 'funny', etc.
    contentTags: [String], // ['emotion', 'surprise', 'quotable']
    hasSetup: Boolean, // Whether clip includes context/setup
    hasPayoff: Boolean, // Whether clip includes resolution/punchline
    analyzedAt: Date
  },

  // Clip processing status
  status: {
    type: String,
    enum: ["ready", "applying_template", "failed"],
    default: "ready",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound indexes for efficient queries
VideoClipSchema.index({ projectId: 1, createdAt: -1 });
VideoClipSchema.index({ userId: 1, viralityScore: -1 });

// Static method to find clips by project
VideoClipSchema.statics.findByProjectId = function (projectId) {
  return this.find({ projectId }).sort({ startTime: 1 });
};

// Pre-save middleware to calculate duration
VideoClipSchema.pre("save", function (next) {
  if (this.isModified("startTime") || this.isModified("endTime")) {
    this.duration = this.endTime - this.startTime;
  }
  next();
});

// Create model only if it doesn't already exist (for Next.js hot reloading)
const VideoClip =
  mongoose.models.VideoClip || mongoose.model("VideoClip", VideoClipSchema);

export default VideoClip;
