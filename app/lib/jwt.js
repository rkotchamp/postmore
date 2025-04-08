import jwt from "jsonwebtoken";

// Secret key should be stored in environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-for-development";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d"; // Token expiration time

/**
 * Generate a JWT for a user
 * @param {Object} payload - Data to be included in the token
 * @returns {string} - The generated token
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify a JWT and return the decoded payload
 * @param {string} token - The token to verify
 * @returns {Object|null} - The decoded payload or null if verification fails
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    return null;
  }
}

/**
 * Generate tokens for authentication
 * @param {Object} user - User object from database
 * @returns {Object} - Object containing tokens
 */
export function generateAuthTokens(user) {
  // Create a sanitized user object without sensitive information
  const userForToken = {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
  };

  // Generate access token
  const accessToken = signToken({
    ...userForToken,
    tokenType: "access",
  });

  // Generate refresh token with longer expiry
  const refreshToken = jwt.sign(
    {
      id: user._id.toString(),
      tokenType: "refresh",
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  return {
    accessToken,
    refreshToken,
  };
}

/**
 * Refresh an access token using a refresh token
 * @param {string} refreshToken - The refresh token
 * @returns {Object} - New tokens or null if refresh token is invalid
 */
export async function refreshAccessToken(refreshToken) {
  try {
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    // Check if it's a refresh token
    if (decoded.tokenType !== "refresh") {
      throw new Error("Invalid token type");
    }

    // Here you would typically:
    // 1. Check if the refresh token is in your database and not revoked
    // 2. Get the user from the database using decoded.id
    // 3. Generate new tokens

    // For this example, we'll just create a minimal user object
    const userForToken = {
      _id: decoded.id,
      email: decoded.email || "unknown@example.com",
      name: decoded.name || "User",
    };

    // Generate new tokens
    return generateAuthTokens(userForToken);
  } catch (error) {
    console.error("Refresh Token Error:", error.message);
    return null;
  }
}
