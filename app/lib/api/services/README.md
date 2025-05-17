# Platform Services Integration

This directory contains platform-specific implementations for social media services.

## BlueSky Video Upload Flow

BlueSky requires a special flow for video uploads:

1. **Direct Upload Required**: Unlike other platforms, BlueSky requires videos to be uploaded directly to their API, not via URLs.

2. **Flow Diagram**:

   ```
   [User Upload] → [Direct BlueSky Upload] → [BlueSky Processing] → [Firebase Archiving] → [Post Creation]
   ```

3. **Implementation Details**:

   - Videos are first uploaded directly to BlueSky using `app.bsky.video.uploadVideo` endpoint
   - BlueSky processes the video (can take time) and returns a blob reference
   - After successful BlueSky processing, we archive the video to Firebase
   - The post is created with the BlueSky blob reference using `app.bsky.embed.video` format
   - Firebase URL is stored for our records but not used in the BlueSky post

4. **Handling Failures**:

   - If BlueSky upload fails, the post fails
   - If Firebase archiving fails, the post still succeeds (Firebase considered non-critical)
   - We log failure details for retry mechanisms

5. **Key Code**:
   - `videoPostBlueSky.js`: Handles direct upload to BlueSky and Firebase archiving
   - `blueSkyService.js`: Creates posts with proper video embeds

## Other Platform Considerations

For platforms that accept media URLs (like Twitter, Instagram, etc.), we use a different flow:

1. Upload media to Firebase first
2. Use the Firebase URL when posting to these platforms

The architecture is flexible to accommodate these different workflows through platform-specific service implementations.
