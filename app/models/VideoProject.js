import mongoose from "mongoose";

/**
 * Video Project Schema
 * Stores video processing sessions for the Clipper Studio feature
 * Each project represents one source video that can generate multiple clips
 */
const VideoProjectSchema = new mongoose.Schema(
  {
    // Reference to the user who owns this project
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Source information
    sourceUrl: {
      type: String,
      trim: true,
    },

    sourceType: {
      type: String,
      enum: ["url", "upload"],
      required: true,
    },

    // Original video file information
    originalVideo: {
      filename: String,
      path: String,
      url: String, // Firebase storage URL for uploaded videos
      duration: Number, // Duration in seconds
      size: Number, // File size in bytes
      format: String, // mp4, mov, avi, etc.
      resolution: String, // 1920x1080, 1280x720, etc.
      thumbnail: String, // Path to generated thumbnail (local)
      thumbnailUrl: String, // Firebase storage URL for thumbnail
    },

    // Transcription data from Whisper or uploaded SRT
    transcription: {
      text: String, // Full transcription text
      language: String, // Detected or specified language
      segments: [
        {
          start: Number, // Start time in seconds
          end: Number, // End time in seconds
          text: String, // Segment text
        },
      ],
      source: {
        type: String,
        enum: ["whisper", "upload"],
        default: "whisper",
      },
    },

    // Project save status for storage management
    saveStatus: {
      isSaved: {
        type: Boolean,
        default: false,
      },
      savedAt: Date,
      autoDeleteAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from creation
      },
    },

    // Processing status
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },

    // Error information if processing fails
    errorMessage: String,

    // Processing metadata
    processingStarted: Date,
    processingCompleted: Date,

    // Analytics
    analytics: {
      totalClipsGenerated: {
        type: Number,
        default: 0,
      },
      totalDownloads: {
        type: Number,
        default: 0,
      },
      lastAccessed: Date,
    },
  },
  { 
    timestamps: true,
    // Add TTL index for auto-deletion of unsaved projects
    index: { autoDeleteAt: 1 }, 
    expireAfterSeconds: 0
  }
);

// Compound index for efficient user queries
VideoProjectSchema.index({ userId: 1, createdAt: -1 });

// Index for cleanup jobs
VideoProjectSchema.index({ "saveStatus.isSaved": 1, "saveStatus.autoDeleteAt": 1 });

// Method to save the project permanently
VideoProjectSchema.methods.saveProject = function () {
  this.saveStatus.isSaved = true;
  this.saveStatus.savedAt = new Date();
  this.saveStatus.autoDeleteAt = undefined; // Remove auto-delete
  return this.save();
};

// Method to update analytics
VideoProjectSchema.methods.incrementClipsGenerated = function () {
  this.analytics.totalClipsGenerated += 1;
  return this.save();
};

VideoProjectSchema.methods.incrementDownloads = function () {
  this.analytics.totalDownloads += 1;
  this.analytics.lastAccessed = new Date();
  return this.save();
};

// Static method to find projects by user
VideoProjectSchema.statics.findByUserId = function (userId, includeUnsaved = true) {
  const query = { userId };
  if (!includeUnsaved) {
    query["saveStatus.isSaved"] = true;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find projects ready for cleanup
VideoProjectSchema.statics.findExpiredProjects = function () {
  return this.find({
    "saveStatus.isSaved": false,
    "saveStatus.autoDeleteAt": { $lte: new Date() },
  });
};

// Pre-save middleware to update processing timestamps
VideoProjectSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    if (this.status === "processing" && !this.processingStarted) {
      this.processingStarted = new Date();
    } else if (
      (this.status === "completed" || this.status === "failed") &&
      !this.processingCompleted
    ) {
      this.processingCompleted = new Date();
    }
  }
  next();
});

// Create model only if it doesn't already exist (for Next.js hot reloading)
const VideoProject =
  mongoose.models.VideoProject ||
  mongoose.model("VideoProject", VideoProjectSchema);

export default VideoProject;