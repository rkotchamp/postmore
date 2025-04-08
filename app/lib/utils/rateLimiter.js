/**
 * A simple in-memory rate limiter for API routes
 * In production, you should use a Redis-based solution for distributed environments
 */

// Store rate limit data in memory (reset on server restart)
// Map of tokens to { counter, timestamp }
const ratelimits = new Map();

/**
 * Create a rate limiter
 * @param {Object} options Rate limiting options
 * @param {number} options.interval Time window in ms
 * @param {number} options.uniqueTokenPerInterval Max number of unique tokens per interval
 * @returns {Object} Rate limiter methods
 */
export function rateLimit(options) {
  const { interval, uniqueTokenPerInterval } = options;

  // Clean up old entries periodically
  const cleanup = () => {
    const now = Date.now();
    for (const [key, value] of ratelimits.entries()) {
      if (now - value.timestamp > interval) {
        ratelimits.delete(key);
      }
    }
  };

  // Schedule cleanup
  if (typeof window === "undefined") {
    // Only run on server
    setInterval(cleanup, interval / 10);
  }

  return {
    /**
     * Check if the token is rate limited
     * @param {string} token Identifier for the client (IP, userID, etc)
     * @param {number} limit Max number of requests allowed in the interval
     * @returns {Promise<void>} Resolves if not rate limited, rejects if limited
     */
    check: (token, limit) =>
      new Promise((resolve, reject) => {
        // Prevent memory leaks
        if (ratelimits.size > uniqueTokenPerInterval) {
          cleanup();
          if (ratelimits.size > uniqueTokenPerInterval) {
            // If still too many entries after cleanup, delete oldest entries
            const keys = [...ratelimits.keys()].sort((a, b) => {
              return ratelimits.get(a).timestamp - ratelimits.get(b).timestamp;
            });
            for (let i = 0; i < Math.ceil(ratelimits.size * 0.4); i++) {
              ratelimits.delete(keys[i]);
            }
          }
        }

        const now = Date.now();
        const tokenKey = `${token}`;

        if (!ratelimits.has(tokenKey)) {
          ratelimits.set(tokenKey, {
            counter: 1,
            timestamp: now,
          });
          return resolve();
        }

        const tokenData = ratelimits.get(tokenKey);
        const elapsedTime = now - tokenData.timestamp;

        // Reset counter if interval has passed
        if (elapsedTime > interval) {
          tokenData.counter = 1;
          tokenData.timestamp = now;
          return resolve();
        }

        // Check if limit exceeded
        if (tokenData.counter > limit) {
          return reject(new Error("Rate limit exceeded"));
        }

        // Increment counter
        tokenData.counter++;
        return resolve();
      }),
  };
}
