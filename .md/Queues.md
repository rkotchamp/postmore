# PostMore Queue System Documentation

## Overview

PostMore uses a robust job queue system based on BullMQ and Redis to handle background tasks such as scheduled posts and token refreshes. This architecture ensures reliability, scalability, and proper handling of time-sensitive operations.

## Queue Types

The application has two main queue types:

1. **Post Queue**: Manages posting content to social media platforms
2. **Token Refresh Queue**: Handles automatic refreshing of authentication tokens

## System Architecture

```
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│                   │     │                   │     │                   │
│   Next.js App     │────▶│    Redis Queue    │────▶│  Worker Process   │
│                   │     │                   │     │                   │
└───────────────────┘     └───────────────────┘     └───────────────────┘
         │                                                    │
         │                                                    │
         ▼                                                    ▼
┌───────────────────┐                              ┌───────────────────┐
│                   │                              │                   │
│ Platform Services │◀─────────────────────────────│   API Manager     │
│                   │                              │                   │
└───────────────────┘                              └───────────────────┘
         │
         │
         ▼
┌───────────────────┐
│                   │
│  Social Platforms │
│                   │
└───────────────────┘
```

## File Structure

```
app/lib/queues/
├── postQueue.js           # Post queue implementation
├── tokenRefreshQueue.js   # Token refresh queue implementation
├── worker.js              # Worker process for both queues
└── setupScheduledJobs.js  # Initializes scheduled jobs
```

## Application Startup

The queue system is initialized during application startup through:

```
app/lib/startup.js         # Main application initialization
```

## Post Queue System

### Purpose

Handles scheduling and processing of posts to various social media platforms.

### Key Files

- **app/lib/queues/postQueue.js**: Implements the post queue functionality
- **app/lib/api/services/apiManager.js**: Connects to platform-specific services

### Main Functions

- `initPostQueue()`: Initializes the post queue
- `getPostQueue()`: Returns the post queue instance
- `addPostToQueue(postData, scheduledAt)`: Adds a post to the queue for processing
- `processPostJob(jobData)`: Processes a post job (used by the worker)

### Job Flow

1. When a user schedules a post, `addPostToQueue()` is called
2. The post is stored in Redis with appropriate delay
3. When the scheduled time arrives, the worker picks up the job
4. `processPostJob()` is called to process the job
5. The post is sent to appropriate platform(s) through the API manager

## Token Refresh Queue System

### Purpose

Automatically refreshes authentication tokens for social media platforms (currently Bluesky) to ensure uninterrupted service.

### Key Files

- **app/lib/queues/tokenRefreshQueue.js**: Implements the token refresh queue functionality
- **app/lib/api/services/blueSkyService.js**: Handles Bluesky-specific token refresh logic
- **app/api/admin/refresh-tokens/route.js**: API endpoint for manual token refresh

### Main Functions

- `initTokenRefreshQueue()`: Initializes the token refresh queue
- `scheduleRegularTokenRefreshes()`: Sets up weekly token refresh schedule
- `refreshAllBlueskyTokens()`: Triggers refresh for all Bluesky accounts
- `refreshAccountTokens(accountId)`: Triggers refresh for a specific account
- `processRefreshAllTokensJob(jobData)`: Processes a refresh all tokens job
- `processRefreshAccountTokensJob(jobData)`: Processes a refresh account tokens job

### Job Flow

1. During application startup, `scheduleRegularTokenRefreshes()` sets up weekly refresh jobs
2. The worker process picks up refresh jobs when scheduled
3. For each job, the appropriate process function is called:
   - `processRefreshAllTokensJob()` for refreshing all tokens
   - `processRefreshAccountTokensJob()` for refreshing a specific account's tokens
4. The refresh function connects to the database and calls `blueSkyService.forceRefreshTokens()`

### Token Refresh Sequence

```
┌──────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────┐    ┌───────────┐
│ Scheduler│    │Token Refresh │    │   Worker    │    │ BlueSkyService│    │ Database│    │Bluesky API│
│          │    │    Queue     │    │             │    │               │    │         │    │           │
└────┬─────┘    └──────┬───────┘    └──────┬──────┘    └───────┬───────┘    └────┬────┘    └─────┬─────┘
     │                 │                    │                   │                 │              │
     │ Schedule Weekly │                    │                   │                 │              │
     │ Refresh         │                    │                   │                 │              │
     │────────────────▶│                    │                   │                 │              │
     │                 │                    │                   │                 │              │
     │                 │  Job Ready         │                   │                 │              │
     │                 │───────────────────▶│                   │                 │              │
     │                 │                    │                   │                 │              │
     │                 │                    │ Process Job       │                 │              │
     │                 │                    │──────────────────▶│                 │              │
     │                 │                    │                   │                 │              │
     │                 │                    │                   │ Find Accounts   │              │
     │                 │                    │                   │────────────────▶│              │
     │                 │                    │                   │                 │              │
     │                 │                    │                   │ Return Accounts │              │
     │                 │                    │                   │◀────────────────│              │
     │                 │                    │                   │                 │              │
     │                 │                    │                   │ Login with      │              │
     │                 │                    │                   │ Refresh Token   │              │
     │                 │                    │                   │────────────────────────────────▶│
     │                 │                    │                   │                 │              │
     │                 │                    │                   │ Return New      │              │
     │                 │                    │                   │ Access Token    │              │
     │                 │                    │                   │◀────────────────────────────────│
     │                 │                    │                   │                 │              │
     │                 │                    │                   │ Update Account  │              │
     │                 │                    │                   │ with New Tokens │              │
     │                 │                    │                   │────────────────▶│              │
     │                 │                    │                   │                 │              │
     │                 │                    │ Return Success    │                 │              │
     │                 │                    │◀──────────────────│                 │              │
     │                 │                    │                   │                 │              │
     │                 │ Mark Job Complete  │                   │                 │              │
     │                 │◀───────────────────│                   │                 │              │
     │                 │                    │                   │                 │              │
```

## Worker Process

### Purpose

Processes jobs from both queues in the background.

### Key File

- **app/lib/queues/worker.js**: Creates and manages worker processes

### Main Functions

- `startWorkers()`: Starts workers for both queues
- `createPostWorker()`: Creates a worker for the post queue
- `createTokenRefreshWorker()`: Creates a worker for the token refresh queue

### Worker Configuration

- Post queue worker: 5 concurrent jobs
- Token refresh queue worker: 2 concurrent jobs

## Scheduled Jobs

### Purpose

Sets up recurring jobs that run on a schedule.

### Key File

- **app/lib/queues/setupScheduledJobs.js**: Initializes all scheduled jobs

### Current Scheduled Jobs

- Token refresh: Every Sunday at midnight (weekly)
  - Uses cron pattern: `0 0 * * 0`
  - Limited to 52 occurrences (1 year) then reschedules

## Manual Triggering

### Purpose

Allows administrators to manually trigger token refreshes.

### Key File

- **app/api/admin/refresh-tokens/route.js**: API endpoint for triggering token refreshes

### Endpoints

- `POST /api/admin/refresh-tokens`: Refreshes all tokens or a specific account's tokens

## Connection to Social Platforms

The queue system connects to social platforms through the API Manager:

1. **Post Queue** → **API Manager** → **Platform-specific services** (e.g., blueSkyService)
2. **Token Refresh Queue** → **Platform-specific services** (e.g., blueSkyService)

## Reliability Features

The queue system includes several reliability features:

1. **Retry Mechanism**: Failed jobs are retried 3 times with exponential backoff
2. **Error Logging**: Detailed error information is logged
3. **Job History**: Failed jobs are kept for 1000 entries for debugging
4. **Concurrency Control**: Limits concurrent job processing to prevent overload
5. **Token Refresh Locks**: Prevents concurrent refreshes for the same account

## Redis Configuration

Both queues use the same Redis configuration specified in environment variables:

- `REDIS_HOST`: Redis server host (default: localhost)
- `REDIS_PORT`: Redis server port (default: 6379)
- `REDIS_PASSWORD`: Redis server password

## Setup for Production

To set up the queue system in production:

1. Install and configure Redis server
2. Set Redis environment variables
3. Start the worker process using a process manager (e.g., PM2)
4. Initialize the application which will set up the queues and scheduled jobs

## Dashboard Access (Future Enhancement)

In the future, an admin dashboard could be added to monitor queue status and job history.
