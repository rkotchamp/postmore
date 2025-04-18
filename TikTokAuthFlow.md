# TikTok OAuth Authorization Flow

## Overview

The TikTok OAuth implementation consists of two main parts:

1. Authorization URL construction and redirect (`app/authenticate/page.jsx`)
2. Callback handling and token exchange (`app/api/auth/callback/tiktok/route.js`)

## Authorization URL Construction

The authorization URL is constructed in the frontend using the following components:

- Base URL: `https://www.tiktok.com/v2/auth/authorize/`
- Required Parameters:
  - `client_key`: Your TikTok App's client ID
  - `response_type`: Set to "code" for OAuth authorization code flow
  - `scope`: Requested permissions (e.g., "user.info.basic")
  - `redirect_uri`: Your app's callback URL (must match TikTok settings)
  - `state`: Random string for CSRF protection

Example URL structure:

```
https://www.tiktok.com/v2/auth/authorize/?
  client_key=YOUR_CLIENT_KEY&
  response_type=code&
  scope=user.info.basic&
  redirect_uri=YOUR_REDIRECT_URI&
  state=RANDOM_STATE_STRING
```

## Callback Handling

When TikTok redirects back to your application:

1. **Initial Validation**

   - Verifies presence of authorization code
   - Checks user authentication status
   - Validates redirect URI configuration

2. **Token Exchange**

   - Endpoint: `https://open.tiktokapis.com/v2/oauth/token/`
   - Method: POST
   - Parameters:
     - `client_key`
     - `client_secret`
     - `code` (from callback)
     - `grant_type: "authorization_code"`
     - `redirect_uri`

3. **Response Handling**
   - Parses token response
   - Logs response data for debugging
   - Redirects user back to application with status

## Security Considerations

1. CSRF Protection

   - Uses state parameter to prevent cross-site request forgery
   - State is generated and stored in localStorage
   - Validated during callback

2. Token Security
   - Tokens are never exposed in client-side code
   - Sensitive parameters are logged securely
   - Error messages are sanitized

## Error Handling

The implementation includes comprehensive error handling:

1. Frontend Errors:

   - Missing configuration
   - Invalid parameters
   - Connection failures

2. Callback Errors:
   - Missing authorization code
   - Authentication failures
   - Token exchange errors
   - Invalid response format

## Required Environment Variables

```env
TIKTOK_CLIENT_ID=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
TIKTOK_REDIRECT_URI=your_callback_url
NEXT_PUBLIC_APP_URL=your_app_url
```

## Debug Mode

The current implementation includes debug features:

- Detailed console logging
- Response information in redirect URLs
- Token response inspection

## Next Steps

1. Implement token storage and management
2. Add user data fetching
3. Handle token refresh flow
4. Implement proper error recovery
5. Add rate limiting and retry logic
