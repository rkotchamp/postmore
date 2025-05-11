# TikTok Integration Flow

This document outlines the complete TikTok OAuth integration process and explains how data flows between components.

## Authentication Flow Overview

1. **User Initiates TikTok Authorization**

   - User clicks "Connect to TikTok" in the Authenticate page
   - Frontend redirects to TikTok OAuth URL with required parameters
   - TikTok shows permission screen to user

2. **Authorization Callback Processing**

   - TikTok redirects back to our callback URL with an authorization code
   - Backend exchanges code for access/refresh tokens
   - Backend fetches creator info from TikTok API

3. **Data Storage and Synchronization**
   - Backend creates/updates `SocialAccount` document with TikTok credentials
   - Backend updates `User` document with reference to the `SocialAccount`
   - Bidirectional relationship is established between collections

## Database Schema Relationship

```
User (1) -----< SocialAccount (Many)
   |               |
   |               |
 _id (ObjectId)    userId (references User._id)
 socialAccounts[]  platform: "tiktok"
                   platformAccountId: "tiktok_open_id"
```

The `User` document contains an array of `socialAccounts` references, while each `SocialAccount` document stores a `userId` reference back to its owning User.

## Key Data Points

1. **User Identity**

   - NextAuth session provides `user.id`
   - This ID is converted to MongoDB ObjectId format
   - Used to link social accounts to the correct user

2. **TikTok Account Identity**

   - Combination of `userId`, `platform`, and `platformAccountId`
   - Unique compound index ensures no duplicate accounts
   - `platformAccountId` uses TikTok's `open_id` field

3. **OAuth Tokens**
   - `accessToken` is used for API calls
   - `refreshToken` allows obtaining new access tokens
   - `tokenExpiry` tracks when token needs refreshing

## Implemented Changes

The following changes were implemented to fix the TikTok integration:

1. **User ID Format Handling**

   - Added conversion from string to MongoDB ObjectId
   - Ensures ID format consistency across collections
   - Uses `mongoose.Types.ObjectId.isValid` and `new mongoose.Types.ObjectId()`

2. **Bidirectional References**

   - Added `User` model import to TikTok callback route
   - Implemented `findByIdAndUpdate` with `$addToSet` to maintain user references
   - Prevents duplicate references while ensuring synchronization

3. **Enhanced Logging**
   - Added detailed logging for ID conversions
   - Tracks the social account creation and user update process
   - Helps with debugging authentication issues

## Cross-Platform Support Architecture

This integration follows the modular architecture defined in `posts_to_services.md`:

1. **Platform-Specific Services**

   - `tiktokService.js` handles all TikTok API interactions
   - Maintains clean separation of platform-specific code

2. **Centralized API Management**

   - `apiManager.js` routes post requests to appropriate services
   - Abstracts platform differences from the application logic

3. **Unified Database Schema**
   - `SocialAccount` model stores credentials for all platforms
   - Common fields with platform-specific metadata

## Error Handling

1. **OAuth Errors**

   - TikTok errors are caught and redirected with descriptive messages
   - Network/server errors are properly logged and communicated to the user

2. **Database Operations**
   - Failed database operations throw exceptions with meaningful error messages
   - Errors during account linking don't corrupt existing data

## How to Verify Integration

1. Click "Connect to TikTok" in the Authenticate page
2. Complete TikTok authorization
3. Verify in MongoDB:
   - `SocialAccount` document created with TikTok credentials
   - `User` document contains reference to the `SocialAccount` \_id
   - Verify bidirectional relationship is intact

## Future Enhancements

1. **Transaction Support**

   - Consider using MongoDB transactions to ensure atomic operations
   - Would prevent partial updates between collections

2. **Refresh Token Management**

   - Implement background job to refresh tokens before expiry
   - Prevent token expiration issues during posting

3. **Multi-Account Support**
   - Allow users to connect multiple TikTok accounts
   - Leverage the existing schema which already supports this pattern
