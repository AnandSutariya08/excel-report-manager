#!/bin/bash

# Firebase Storage CORS Configuration Script
# This script configures CORS for Firebase Storage to allow browser access

echo "🔧 Configuring CORS for Firebase Storage..."
echo ""

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo "❌ Error: gsutil is not installed."
    echo ""
    echo "Please install Google Cloud SDK:"
    echo "1. Download from: https://cloud.google.com/sdk/docs/install"
    echo "2. Or install via package manager:"
    echo "   - macOS: brew install google-cloud-sdk"
    echo "   - Windows: Download installer from Google Cloud"
    echo "   - Linux: Follow instructions at https://cloud.google.com/sdk/docs/install"
    echo ""
    exit 1
fi

# Check if authenticated
echo "Checking authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "⚠️  Not authenticated. Please run: gcloud auth login"
    exit 1
fi

# Set project
PROJECT_ID="demoproject-c9fbc"
BUCKET_NAME="${PROJECT_ID}.firebasestorage.app"

echo "📦 Project: ${PROJECT_ID}"
echo "🪣 Bucket: ${BUCKET_NAME}"
echo ""

# Apply CORS configuration
echo "Applying CORS configuration..."
if gsutil cors set configure-cors.json gs://${BUCKET_NAME}; then
    echo "✅ CORS configuration applied successfully!"
    echo ""
    echo "Verifying configuration..."
    gsutil cors get gs://${BUCKET_NAME}
    echo ""
    echo "✅ Done! CORS is now configured."
    echo "🔄 Please refresh your browser to see the changes."
else
    echo "❌ Failed to apply CORS configuration."
    exit 1
fi

