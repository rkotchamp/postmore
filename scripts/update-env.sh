#!/bin/bash

# Script to update environment variables for production deployment
# Usage: ./scripts/update-env.sh <production-domain>
# Example: ./scripts/update-env.sh example.com

# Check if domain parameter is provided
if [ $# -eq 0 ]; then
    echo "Error: Production domain parameter is required"
    echo "Usage: $0 <production-domain>"
    echo "Example: $0 example.com"
    exit 1
fi

PRODUCTION_DOMAIN=$1
ENV_FILE=".env"

# Backup the current .env file
cp $ENV_FILE "${ENV_FILE}.bak"
echo "Backed up .env to .env.bak"

# Update the URLs in the .env file
sed -i '' "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://${PRODUCTION_DOMAIN}|g" $ENV_FILE
sed -i '' "s|AUTHORISED_REDIRECT_URLS=.*|AUTHORISED_REDIRECT_URLS=https://${PRODUCTION_DOMAIN}/dashboard|g" $ENV_FILE
sed -i '' "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://${PRODUCTION_DOMAIN}|g" $ENV_FILE
sed -i '' "s|TIKTOK_REDIRECT_URI=.*|TIKTOK_REDIRECT_URI=https://${PRODUCTION_DOMAIN}/api/auth/callback/tiktok|g" $ENV_FILE
sed -i '' "s|NEXT_PUBLIC_TIKTOK_REDIRECT_URI=.*|NEXT_PUBLIC_TIKTOK_REDIRECT_URI=https://${PRODUCTION_DOMAIN}/api/auth/callback/tiktok|g" $ENV_FILE

echo "Updated environment variables for production domain: ${PRODUCTION_DOMAIN}"
echo "Please update your TikTok Developer Portal with the new redirect URI: https://${PRODUCTION_DOMAIN}/api/auth/callback/tiktok"
echo "Don't forget to restart your application after updating the environment variables" 