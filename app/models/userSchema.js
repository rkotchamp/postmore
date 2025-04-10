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
  socialAccounts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SocialAccount",
    },
  ],
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
