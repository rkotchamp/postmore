# Queue Workers for Scheduled Posts

This directory contains the queue processing infrastructure for Postmore's scheduled posts.

## Overview

We use BullMQ backed by Redis to handle scheduled posts and token refreshes. The main components are:

- `postQueue.js` - Handles adding posts to the queue for scheduled delivery
- `tokenRefreshQueue.js` - Manages refreshing authentication tokens for social platforms
- `worker.js` - The worker process that processes jobs from both queues (Next.js version)
- `standalone-worker.mjs` - A standalone version of the worker that runs outside Next.js
- `postQueue.mjs` and `tokenRefreshQueue.mjs` - Special versions for the standalone worker

## Running the Worker

There are two ways to run the worker process:

### Method 1: Using the standalone worker (recommended)

```bash
npm run standalone-worker
```

This uses the .mjs files with proper ES module support and relative imports, which work correctly when run as a standalone Node.js script outside of Next.js.

### Method 2: Using the worker directly (not recommended)

```bash
npm run worker
```

This runs the regular worker process but requires setting "type": "module" in package.json, which can affect the entire project.

## Production Setup

In production, you should:

1. Ensure Redis is running and accessible
2. Run the standalone worker as a separate process that stays running
3. Use a process manager like PM2 to keep the worker running

Example PM2 configuration:

```json
{
  "apps": [
    {
      "name": "postmore-worker",
      "script": "app/lib/queues/standalone-worker.mjs",
      "instances": 1,
      "autorestart": true,
      "watch": false,
      "env": {
        "NODE_ENV": "production"
      }
    }
  ]
}
```

## File Structure Explanation

- `.js` files: Used within the Next.js app with Next.js path aliases (@/app/...)
- `.mjs` files: Used for standalone Node.js processes with relative paths

The .mjs files are duplicates of the .js files, but with modified imports to work outside of Next.js. This allows your main Next.js app to use the normal imports while the worker can run as a separate process.

## Troubleshooting

Common issues:

1. **Redis connection errors**: Make sure Redis is running and the connection details are correct
2. **Import errors**: Make sure you're using the standalone worker with .mjs files
3. **Module errors**: If seeing "Cannot use import statement outside a module", make sure you're using the .mjs files
4. **Process exits unexpectedly**: Check for uncaught exceptions in the logs
