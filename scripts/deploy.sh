#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment..."

# Pull the latest changes
echo "📥 Pulling latest changes from git..."
git pull

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Build the application
echo "🔨 Building the application..."
npm run build

# Restart the PM2 processes
echo "🔄 Restarting PM2 processes..."
npm run pm2-restart || npm run pm2-start

echo "✅ Deployment completed successfully!" 