import mongoose from "mongoose";

/**
 * Template Schema
 * Stores video templates for Clipper Studio clips
 * Templates are applied to clips to create styled videos
 */
const TemplateSchema = new mongoose.Schema(
  {
    // Template name for display
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Special identifier for the default plain template
    isDefault: {
      type: Boolean,
      default: false,
      index: true, // Only one template should have this as true
    },

    // Template category for organization
    category: {
      type: String,
      enum: ["motivational", "lifestyle", "meme", "educational", "business"],
      required: true,
      index: true,
    },

    // Thumbnail image for left panel display
    thumbnail: {
      type: String,
      required: true, // Essential for template selection UI
    },

    // Template configuration for rendering
    config: {
      fonts: [String], // Font families to use
      colors: [String], // Color palette
      layout: String, // Layout type/style
      animations: [String], // Animation effects
    },

    // Template availability
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Display order in left panel template list
    sortOrder: {
      type: Number,
      default: 0, // Default template should be sortOrder: -1 to appear first
      index: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  }
);

// Compound index for active templates ordered by sort
TemplateSchema.index({ isActive: 1, sortOrder: 1 });

// Static method to get templates for left panel display
TemplateSchema.statics.getActiveTemplates = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 });
};

// Static method to get the default template
TemplateSchema.statics.getDefaultTemplate = function() {
  return this.findOne({ isDefault: true, isActive: true });
};

// Static method to get templates by category
TemplateSchema.statics.getByCategory = function(category) {
  return this.find({ 
    category: category, 
    isActive: true 
  }).sort({ sortOrder: 1 });
};

// Pre-save middleware to ensure only one default template
TemplateSchema.pre("save", async function(next) {
  if (this.isModified("isDefault") && this.isDefault) {
    // Remove default flag from all other templates
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Create model only if it doesn't already exist (for Next.js hot reloading)
const Template =
  mongoose.models.Template ||
  mongoose.model("Template", TemplateSchema);

export default Template;