#PostMore Social Scheduler App

A Next.js app to schedule posts across multiple platforms (Facebook, Instagram, YouTube Shorts, etc.).

## Features

- **Multi-platform posting**: Schedule to 5+ platforms.
- **Media support**: Upload images/videos.
- **OAuth integration**: Connect social accounts securely.
- **Scheduling**: BullMQ queues handle delayed posts.
- **Error tracking**: Notify users of failed posts.

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB
- **Auth**: NextAuth.js
- **Storage**: Firebase
- **Scheduling**: BullMQ + Redis

## Environment Variables

MONGO_URI=your_mongodb_uri  
REDIS_URL=redis://localhost:6379  
FIREBASE_STORAGE_BUCKET=your-bucket  
FACEBOOK_APP_ID=...  
INSTAGRAM_APP_SECRET=...
