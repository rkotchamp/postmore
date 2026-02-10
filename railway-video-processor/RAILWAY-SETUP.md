# Railway Video Processor Setup

## Quick Start

### 1. Create Railway Project
```bash
railway login
railway init
```

### 2. Add Redis Service
Railway Dashboard → New → Database → Redis

### 3. Create Services

| Service | Start Command |
|---------|---------------|
| video-api | `node railway-video-processor/video-processing-server.mjs` |
| worker | `node app/lib/queues/standalone-worker.mjs` |
| token-refresh | `node app/lib/queues/tokenRefreshQueue.mjs` |

### 4. Environment Variables

**On Railway:**
```
MONGODB_URI=<copy from Vercel>
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
VIDEO_API_SECRET=<generate-strong-secret>
FIREBASE_PROJECT_ID=<copy from Vercel>
FIREBASE_PRIVATE_KEY=<copy from Vercel>
FIREBASE_CLIENT_EMAIL=<copy from Vercel>
FIREBASE_STORAGE_BUCKET=<copy from Vercel>
```

**On Vercel (add these):**
```
RAILWAY_VIDEO_API_URL=https://your-video-api.up.railway.app
VIDEO_API_SECRET=<same as Railway>
REDIS_HOST=<from Railway>
REDIS_PORT=<from Railway>
REDIS_PASSWORD=<from Railway>
```

## API Endpoints

- `GET /health` - Health check
- `POST /metadata` - Get video metadata
- `POST /download` - Download video
- `POST /download-with-metadata` - Download with metadata

## Local Testing
```bash
VIDEO_API_SECRET=test node video-processing-server.mjs
```
