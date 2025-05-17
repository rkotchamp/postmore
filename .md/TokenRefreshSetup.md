# Token Refresh System: Integration Guide

This document provides instructions for setting up and activating the automatic token refresh system for Bluesky authentication in PostMore.

## Overview

The token refresh system automatically refreshes authentication tokens for Bluesky accounts on a regular schedule. This ensures that posts can be made without interruption even when tokens expire.

## Prerequisites

1. Redis server installed and running
2. BullMQ package installed (`npm install bullmq`)
3. PostMore application configured with Next.js

## Integration Steps

### Step 1: Initialize the Application

To activate the token refresh system, import and call the initialization function in your application's startup code.

Add this to your `pages/_app.js` or equivalent:

```javascript
import { useEffect } from "react";
import { initializeApp } from "@/app/lib/startup";

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Initialize the application including token refresh system
    initializeApp().catch(console.error);
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
```

### Step 2: Start the Worker Process

The worker process needs to be running to process token refresh jobs. In development, you can start it manually:

1. Create a file named `worker.js` in the project root:

```javascript
// worker.js
require("dotenv").config();
const { startWorkers } = require("./app/lib/queues/worker");

// Start the workers
startWorkers();

console.log("Worker process started");
```

2. Run the worker process:

```bash
node worker.js
```

### Step 3: Set Up Environment Variables

Make sure the following environment variables are set in your `.env` file:

```
# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# For production, use a proper Redis instance
# REDIS_HOST=your-redis-host.com
# REDIS_PORT=6379
# REDIS_PASSWORD=your_redis_password
```

### Step 4: Configure Token Refresh Schedule

By default, tokens are refreshed weekly. You can adjust the schedule in `app/lib/queues/tokenRefreshQueue.js`:

```javascript
// In scheduleRegularTokenRefreshes function
const job = await queue.add(
  "refresh-all-tokens",
  { scheduled: true },
  {
    jobId: `refresh-all-tokens-${Date.now()}`,
    repeat: {
      pattern: "0 0 * * 0", // Cron pattern (default: midnight every Sunday)
      limit: 52, // Number of occurrences (default: 52 weeks)
    },
  }
);
```

## Production Setup

For production environments, use a process manager like PM2 to keep the worker process running:

1. Install PM2:

```bash
npm install -g pm2
```

2. Create a PM2 configuration file `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "postmore-worker",
      script: "./worker.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
```

3. Start the worker with PM2:

```bash
pm2 start ecosystem.config.js
```

## Manual Token Refresh

You can trigger a manual token refresh using the admin API:

1. To refresh all accounts:

```bash
curl -X POST http://localhost:3000/api/admin/refresh-tokens \
  -H "Content-Type: application/json" \
  -d '{}'
```

2. To refresh a specific account:

```bash
curl -X POST http://localhost:3000/api/admin/refresh-tokens \
  -H "Content-Type: application/json" \
  -d '{"accountId": "6806a8c4302c4281518c95b2"}'
```

## Monitoring

To monitor the token refresh jobs, check the application logs:

```bash
# For worker logs with PM2
pm2 logs postmore-worker

# For application logs
npm run logs
```

## Common Issues and Troubleshooting

### Issue: Token Refresh Jobs Not Running

**Solution:**

1. Check if Redis is running: `redis-cli ping` (should return PONG)
2. Verify the worker process is running
3. Check environment variables are set correctly

### Issue: Worker Connection Errors

**Solution:**

1. Check Redis connection parameters
2. Ensure Redis is not blocking connections (check firewall)
3. Restart the worker process

### Issue: Token Refresh Fails

**Solution:**

1. Check that Bluesky accounts have valid refresh tokens
2. Verify network connectivity to Bluesky API
3. Check for rate limiting or IP blocks

## Security Considerations

1. Store Redis credentials securely (use environment variables)
2. Do not expose Redis to the internet without authentication
3. Ensure access to the admin API is properly authenticated
4. Avoid storing tokens in client-side code or cookies

## Next Steps

After setting up the token refresh system, consider:

1. Adding monitoring tools to track job success/failure rates
2. Setting up alerts for failed token refreshes
3. Creating an admin interface for managing tokens manually
