#!/bin/bash

# Firebase Storage CORS Configuration Script
# This script configures CORS rules for Firebase Storage to allow video streaming

echo "🔧 Setting up Firebase Storage CORS configuration..."

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo "❌ Error: gsutil is not installed."
    echo "Please install Google Cloud SDK first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set your Firebase Storage bucket name
BUCKET_NAME="postmoore-e0b20.firebasestorage.app"

echo "📦 Configuring CORS for bucket: gs://$BUCKET_NAME"

# Apply CORS configuration
gsutil cors set firebase-cors.json gs://$BUCKET_NAME

if [ $? -eq 0 ]; then
    echo "✅ CORS configuration applied successfully!"
    echo "🎥 Your Firebase videos should now be able to stream in the browser."
    echo ""
    echo "Current CORS configuration:"
    gsutil cors get gs://$BUCKET_NAME
else
    echo "❌ Failed to apply CORS configuration."
    echo "Make sure you're authenticated with Google Cloud:"
    echo "gcloud auth login"
    echo "gcloud config set project your-project-id"
fi