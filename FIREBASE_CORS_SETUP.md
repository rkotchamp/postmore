# Firebase Storage CORS Configuration

To fix the video streaming CORS issues, you need to configure Firebase Storage CORS rules.

## Option 1: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `postmoore-e0b20`
3. Go to Storage → Rules
4. Add these CORS headers to your storage rules

## Option 2: Using Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `postmoore-e0b20`
3. Go to Cloud Storage → Browser
4. Find your bucket: `postmoore-e0b20.firebasestorage.app`
5. Go to "Permissions" tab
6. Add CORS configuration

## Option 3: Install Google Cloud SDK (Recommended)

```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Initialize and authenticate
gcloud init
gcloud auth login

# Apply CORS configuration
gsutil cors set firebase-cors.json gs://postmoore-e0b20.firebasestorage.app

# Verify CORS configuration
gsutil cors get gs://postmoore-e0b20.firebasestorage.app
```

## CORS Configuration (firebase-cors.json)

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Range", "Accept-Ranges", "Content-Length"]
  }
]
```

## Troubleshooting

If videos still don't load after CORS configuration:

1. **Clear browser cache** - CORS changes may be cached
2. **Check video URLs** - Ensure they're valid Firebase Storage URLs
3. **Verify video format** - Ensure videos are properly encoded MP4
4. **Check network tab** - Look for 206 (Partial Content) responses instead of CORS errors

## Alternative Solution

If CORS continues to be problematic, the app includes fallback UI:
- Shows "Video unavailable" message
- Provides "Open in new tab" button
- Download functionality still works