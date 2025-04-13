# TikTok Integration Setup Guide

This guide explains how to set up and configure TikTok integration with PostMore.

## Prerequisites

1. A TikTok Developer account (sign up at [developers.tiktok.com](https://developers.tiktok.com/))
2. Your application domain (development or production)

## Setup Steps

### 1. Create a TikTok Developer App

1. Log in to your [TikTok Developer](https://developers.tiktok.com/) account
2. Click on "Manage Apps" in your profile
3. Click "Connect an app" to create a new app
4. Fill in the required information:
   - App Name: "PostMore" (or your preferred name)
   - Category: "Social Networking"
   - Description: "Social media scheduling platform for multiple platforms"
   - App Icon: Upload your app icon

### 2. Configure App Details

1. Select the platforms your app will run on (Web, Mobile, etc.)
2. For Web apps, enter your website URL (e.g., https://yourdomain.com)

### 3. Add Products and Scopes

1. In the Products section, click "Add products"
2. Add "Login Kit" and "Content Posting API"
3. In the Scopes section, add the following scopes:
   - `user.info.basic` - For user profile information
   - `video.publish` - For posting videos and photos

### 4. Configure Redirect URI

This is the critical step that ensures the TikTok OAuth flow works correctly.

1. In the Login Kit settings, add your redirect URI:
   - For development: `https://your-ngrok-tunnel.ngrok-free.app/api/auth/callback/tiktok`
   - For production: `https://yourdomain.com/api/auth/callback/tiktok`
2. The URI must match **exactly** what is in your `.env` file

### 5. Enable Direct Post for Content Posting API

1. In the Content Posting API settings, enable "Direct Post" mode

### 6. Update Environment Variables

1. Make sure your `.env` file contains the following variables:

   ```
   TIKTOK_CLIENT_ID=your_client_key
   TIKTOK_CLIENT_SECRET=your_client_secret
   TIKTOK_REDIRECT_URI=https://your-domain.com/api/auth/callback/tiktok
   NEXT_PUBLIC_TIKTOK_CLIENT_ID=your_client_key
   NEXT_PUBLIC_TIKTOK_REDIRECT_URI=https://your-domain.com/api/auth/callback/tiktok
   ```

2. For development with ngrok, use your ngrok URL in the redirect URIs
3. For production, use your production domain

### 7. Switching Between Development and Production

When switching between development and production:

1. Update your `.env` file with the appropriate URLs
2. Update the redirect URI in your TikTok Developer Portal
3. You can use the included script to update all environment variables at once:
   ```
   ./scripts/update-env.sh yourdomain.com
   ```

## Troubleshooting

### Common Errors

1. **Redirect URI mismatch**

   - Error: "We couldn't log in with TikTok. This may be due to specific app settings. If you're a developer, correct the following and try again: redirect_uri"
   - Solution: Make sure the redirect URI in your TikTok Developer Portal **exactly** matches the one in your `.env` file

2. **Invalid scope**

   - Error: "Invalid scope"
   - Solution: Verify that the scopes you're requesting in your OAuth flow match the ones you've enabled in your TikTok Developer Portal

3. **Authentication failed**
   - Error: "Authentication failed"
   - Solution: Check your client ID and client secret in your `.env` file

## Testing the Integration

1. Run your application and navigate to the Authentication page
2. Click "Connect to TikTok"
3. You should be redirected to TikTok's authorization page
4. After authorizing, you should be redirected back to your application

## Additional Resources

- [TikTok Developer Documentation](https://developers.tiktok.com/doc/getting-started-create-an-app)
- [Content Posting API Documentation](https://developers.tiktok.com/doc/content-posting-api-get-started)
