# Posts API to Services Connection

## Architecture Overview

The PostMore application implements a layered architecture that separates the API endpoints in the `app/api/posts` directory from the platform-specific implementations in the `app/lib/api/services` directory. This separation of concerns enables clean code organization, easier testing, and the ability to add new social media platforms without modifying existing endpoint logic.

## Flow of Data

1. **API Routes** (`/app/api/posts/...`)

   - Receive HTTP requests from the client
   - Validate request parameters and authentication
   - Prepare data for service layer consumption
   - Route to appropriate service functions
   - Handle responses and errors

2. **API Manager** (`/app/lib/api/services/apiManager.js`)

   - Acts as a facade for all platform-specific services
   - Provides unified methods for posting and scheduling
   - Routes requests to the appropriate platform service
   - Standardizes error handling and response formats

3. **Platform Services** (`/app/lib/api/services/*Service.js`)

   - Implement platform-specific API calls and logic
   - Handle authentication and token refresh
   - Format data according to platform requirements
   - Process media files as needed for each platform
   - Return standardized responses

4. **Scheduling System** (`/app/lib/queues/postQueue.js`)
   - Uses BullMQ with Redis for job management
   - Schedules posts for future publication
   - Processes jobs at the scheduled time
   - Calls platform services through the API Manager

## Immediate vs. Scheduled Posting

### Immediate Posting

When a post is submitted for immediate publication:

1. The client calls `/api/posts/submit` with `scheduleType: "immediate"`
2. The API route validates the request and calls `apiManager.postToMultiplePlatforms()`
3. The API Manager routes the request to each selected platform service
4. Each platform service processes the post and returns results
5. The API route aggregates results and responds to the client

```javascript
// From app/api/posts/submit/route.js
if (scheduleType === "immediate") {
  // Post immediately
  results = await apiManager.postToMultiplePlatforms(targets, postData);
}
```

### Scheduled Posting

When a post is scheduled for future publication:

1. The client calls `/api/posts/submit` with `scheduleType: "scheduled"` and a `scheduledAt` timestamp
2. The API route validates the request and calls `apiManager.schedulePost()` for each platform/account
3. The API Manager adds jobs to the BullMQ queue with the appropriate delay
4. At the scheduled time, the worker process processes the job
5. The worker calls the API Manager to execute the post
6. The API Manager routes to the appropriate platform service
7. Results are logged and stored in the database

```javascript
// From app/api/posts/submit/route.js
if (scheduleType === "scheduled" && scheduledAt) {
  // Schedule the post
  results = await Promise.all(
    targets.map(({ platform, account }) =>
      apiManager.schedulePost(
        platform,
        account,
        postData,
        new Date(scheduledAt)
      )
    )
  );
}
```

## Platform Services Implementation

Each platform service implements a standard interface with the following key methods:

1. **post(accountData, postData)** - Posts content immediately
2. Additional platform-specific methods as needed

Each service handles:

- Platform-specific validation
- Content formatting
- Media processing
- API authentication
- Error handling and retries

## Adding a New Platform

To add support for a new social media platform:

1. Create a new service file (e.g., `twitterService.js`)
2. Implement the standard interface methods
3. Add the service to the `platformServices` object in `apiManager.js`

```javascript
// In apiManager.js
const platformServices = {
  youtube: youtubeService,
  tiktok: tiktokService,
  instagram: instagramService,
  twitter: twitterService, // New platform
};
```

No changes to the API routes are needed, as they work with the API Manager abstraction.

## Error Handling

Errors are handled at multiple levels:

1. **Service Level**: Platform-specific errors are caught and transformed into standard formats
2. **API Manager Level**: Centralizes error handling and provides consistent responses
3. **API Route Level**: Returns appropriate HTTP status codes and error messages
4. **Queue Level**: Implements retries with exponential backoff for transient errors

## Security Considerations

- API routes verify authentication before processing requests
- Platform tokens are securely stored and refreshed as needed
- Rate limiting is implemented to prevent abuse
- Validation ensures only appropriate content is submitted
