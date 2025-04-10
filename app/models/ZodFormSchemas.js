import { z } from "zod";

// User registration schema
export const registerSchema = z
  .object({
    fullName: z.string().min(4, {
      message: "Full name must be at least 4 characters long",
    }),
    email: z.string().email({
      message: "Please enter a valid email address",
    }),
    password: z
      .string()
      .min(8, {
        message: "Password must be at least 8 characters long",
      })
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        {
          message:
            "Password must include uppercase, lowercase, number and special character",
        }
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Login schema
export const loginSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address",
  }),
  password: z.string().min(1, {
    message: "Password is required",
  }),
  rememberMe: z.boolean().optional().default(false),
});

// Profile update schema
export const profileSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters long",
  }),
  email: z.string().email({
    message: "Please enter a valid email address",
  }),
  fullName: z
    .string()
    .min(2, {
      message: "Full name must be at least 2 characters long",
    })
    .optional(),
  bio: z
    .string()
    .max(160, {
      message: "Bio must not exceed 160 characters",
    })
    .optional(),
});

// Password change schema
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, {
      message: "Current password is required",
    }),
    newPassword: z
      .string()
      .min(8, {
        message: "New password must be at least 8 characters long",
      })
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        {
          message:
            "Password must include uppercase, lowercase, number and special character",
        }
      ),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match",
    path: ["confirmNewPassword"],
  });

// Post schema
export const postSchema = z.object({
  title: z.string().min(5, {
    message: "Title must be at least 5 characters long",
  }),
  content: z.string().min(10, {
    message: "Content must be at least 10 characters long",
  }),
  tags: z.array(z.string()).optional(),
  publishDate: z.date().optional(),
  platforms: z.array(z.string()),
});

// Social account schema
export const socialAccountSchema = z.object({
  platform: z.enum(["instagram", "twitter", "facebook", "threads", "youtube"], {
    message: "Please select a valid platform",
  }),
  username: z.string().min(3, {
    message: "Username must be at least 3 characters long",
  }),
  email: z
    .string()
    .email({
      message: "Please enter a valid email address",
    })
    .optional(),
  token: z.string().optional(),
});

// Recover account schema
export const recoverAccountSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address",
  }),
});

// New password schema (for when user clicks the reset link)
export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, {
        message: "Password must be at least 8 characters long",
      })
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        {
          message:
            "Password must include uppercase, lowercase, number and special character",
        }
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Export a simple validator function to use with any schema
export const validateForm = (schema, data) => {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData, error: null };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.errors || "Validation failed",
    };
  }
};
