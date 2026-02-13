# Dockerfile for Railway deployment
# Supports: video-api, standalone-worker, token-refresh services

FROM node:20-slim AS base

# Install system dependencies for video processing
RUN apt-get update && apt-get install -y \
    # FFmpeg for video processing
    ffmpeg \
    # Python for yt-dlp
    python3 \
    python3-pip \
    # Network utilities
    curl \
    ca-certificates \
    # Cleanup to reduce image size
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Install curl_cffi first for browser impersonation (required for Kick, Rumble)
RUN pip3 install --break-system-packages curl_cffi

# Install yt-dlp with all default deps and curl-cffi impersonation support
RUN pip3 install --break-system-packages "yt-dlp[default,curl-cffi]"

# Verify installations and confirm impersonation targets are available
RUN ffmpeg -version && yt-dlp --version && echo "Impersonate targets:" && yt-dlp --list-impersonate-targets 2>&1 | head -10

# Set environment variables for binary paths
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe
ENV YTDLP_PATH=/usr/local/bin/yt-dlp

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Create temp directories for video processing
RUN mkdir -p /app/temp/downloads /app/temp/processing \
    && chmod -R 755 /app/temp

# Set environment variables
ENV NODE_ENV=production
ENV VIDEO_DOWNLOAD_DIR=/app/temp/downloads
ENV VIDEO_PROCESSING_TEMP_DIR=/app/temp/processing

# Expose port for video-api service
EXPOSE 3001

# Default command - runs standalone worker
# Override per service in Railway:
#   video-api: node railway-services/video-api/server.mjs
#   worker: node app/lib/queues/standalone-worker.mjs
#   token-refresh: node app/lib/queues/tokenRefreshQueue.mjs
CMD ["node", "app/lib/queues/standalone-worker.mjs"]
