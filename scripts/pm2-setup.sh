#!/bin/bash

# Exit on error
set -e

echo "🚀 Setting up PM2..."

# Check if PM2 is installed
if ! command -v ./node_modules/.bin/pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Installing..."
    npm install pm2 --save-dev --legacy-peer-deps
fi

# Check if the ecosystem file exists
if [ ! -f ecosystem.config.js ]; then
    echo "❌ ecosystem.config.js not found!"
    exit 1
fi

# Start the application with PM2
echo "✅ Starting the application with PM2..."
npm run pm2-start

# Show status
echo "📊 PM2 Status:"
npm run pm2-status

echo "
🔄 PM2 Commands:
- npm run pm2-start   : Start all processes
- npm run pm2-stop    : Stop all processes
- npm run pm2-restart : Restart all processes
- npm run pm2-reload  : Reload all processes (zero downtime)
- npm run pm2-delete  : Delete all processes
- npm run pm2-status  : Show process status
- npm run pm2-logs    : Show logs

✨ Setup completed!" 