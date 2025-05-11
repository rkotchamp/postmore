# Project Current State Summary

**Date:** 2025-04-24 (Please update with the actual date)

## Overview

This document summarizes the current status of the PostMore social media connection integrations. We have successfully integrated TikTok and implemented backend logic for Bluesky, YouTube, and Instagram connections. However, we are currently facing a specific issue with retrieving Facebook Pages during the Instagram connection flow for Test Users.

## Completed Integrations & Progress

1.  **TikTok:**

    - Full OAuth 2.0 flow implemented and working correctly.
    - Authorization codes are exchanged for access and refresh tokens.
    - Tokens and basic account information are stored in the database (`SocialAccount` model).
    - Frontend displays connection status.
    - _Relevant Files:_ `app/api/auth/callback/tiktok/route.js`, `app/authenticate/page.jsx`

2.  **Bluesky:**

    - Backend API route (`/api/auth/bluesky/login`) created to handle login using handle and App Password.
    - Frontend modal (`BlueskyLoginModal.jsx`) created to collect credentials.
    - Frontend `Authenticate` page triggers the modal and calls the backend API.
    - Session data (JWTs, handle, DID) is stored in the database.
    - Asynchronous fetching of the profile picture after successful login is implemented in the backend route.
    - _Relevant Files:_ `app/api/auth/bluesky/login/route.js`, `app/authenticate/components/BlueskyLoginModal.jsx`, `app/authenticate/page.jsx`

3.  **YouTube (via Google OAuth):**

    - Backend route (`/api/auth/youtube/connect`) created to generate the Google OAuth authorization URL with required YouTube scopes.
    - Backend callback handler (`/api/auth/callback/youtube`) created to exchange the code for tokens, fetch user info, and store the connection (including refresh token).
    - Frontend button handler (`handleYtShortsConnection` in `page.jsx`) calls the connect route and redirects the user to Google.
    - _Status:_ Initial implementation complete, requires full end-to-end testing.
    - _Relevant Files:_ `app/api/auth/youtube/connect/route.js`, `app/api/auth/callback/youtube/route.js`, `app/authenticate/page.jsx`, `.env`

4.  **Instagram (via Facebook Login):**
    - Backend route (`/api/auth/instagram/connect`) created to generate the Facebook Login URL with required Instagram & Pages scopes.
    - Backend callback handler (`/api/auth/callback/instagram`) created to exchange code for tokens, attempt to fetch user's Facebook Pages, find linked Instagram Business accounts, and store connection details.
    - Frontend button handler (`handleInstagramConnection` in `page.jsx`) calls the connect route and redirects the user to Facebook.
    - _Status:_ Flow initiates correctly, but fails during callback processing (see below).
    - _Relevant Files:_ `app/api/auth/instagram/connect/route.js`, `app/api/auth/callback/instagram/route.js`, `app/authenticate/page.jsx`, `.env`

## Current Blocker: Instagram Connection Failure

- **Issue:** When attempting to connect an Instagram account using a Facebook Test User, the process fails during the callback phase. Specifically, the API call to the Facebook Graph API endpoint `/me/accounts` (intended to list the Facebook Pages managed by the user) returns an empty array (`data: []`).
- **Symptoms:** Because no pages are returned, the subsequent step of finding a linked Instagram Business/Creator account (`?fields=instagram_business_account{...}`) cannot proceed. This results in the backend throwing an error: "No Instagram Business or Creator accounts linked to your accessible Facebook Pages were found...".
- **Contradiction:** This occurs even though:
  - The Facebook consent screen presented to the Test User correctly shows the requested permissions, including "Show a list of the Pages you manage", and indicates that the relevant Page was selected.
  - The Test User account has been confirmed (manually) to manage a Facebook Page which is linked to an active Instagram Business/Creator account.
- **Affected Files:**
  - `app/api/auth/callback/instagram/route.js`: Contains the logic calling `/me/accounts`.
  - `app/api/auth/instagram/connect/route.js`: Defines the requested scopes (`pages_show_list` included).
  - `.env`: Contains App ID/Secret (verified as correct).

## Next Steps

1.  **Debug Instagram Issue:**

    - **Re-verify Permissions:** Remove the app from the Test User's Facebook settings (`Apps and Websites`) and re-authenticate, carefully ensuring all permissions (especially `pages_show_list`) are granted for the correct Page during the consent flow.
    - **Graph API Explorer:** Log in to the [Graph API Explorer](https://developers.facebook.com/tools/explorer/) _as the Test User_. Select the PostMore app. Generate a User Access Token, explicitly adding the `pages_show_list` permission. Execute a query directly against the `/me/accounts` endpoint. Analyze the response. This will help determine if the issue lies in the token/permissions obtained by the app's flow or with the Test User's account/page linkage itself.
    - **Business Manager:** If the Page is managed via Meta Business Suite, verify the Test User's role and permissions for the Page within Business Settings, and ensure the PostMore app has integration permissions if necessary.

2.  **Test YouTube Flow:** Perform an end-to-end test of the YouTube connection flow using a Google account (potentially a test account if available). Verify tokens are stored correctly.

3.  **Refine Bluesky:** Enhance the UI feedback within the Bluesky login modal for clarity.

4.  **General:** Continue development of core scheduling and posting features, integrating the stored tokens/credentials for making API calls to the connected platforms.
