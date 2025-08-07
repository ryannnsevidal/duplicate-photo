#!/bin/bash

# 🚀 Deploy Cloud Credentials to Supabase Edge Functions
# This script uploads your Google/Dropbox API keys to Supabase for the cloud-credentials function

echo "🔧 Setting up Supabase Edge Function secrets for cloud integrations..."

# Load environment variables
source .env

# Check if required variables exist
if [ -z "$VITE_GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo "❌ Error: Google credentials missing in .env file"
    echo "Required: VITE_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET"
    exit 1
fi

if [ -z "$VITE_DROPBOX_APP_KEY" ]; then
    echo "❌ Error: Dropbox credentials missing in .env file"
    echo "Required: VITE_DROPBOX_APP_KEY"
    exit 1
fi

echo "✅ Found required credentials in .env file"

# Deploy cloud-credentials function with secrets
echo "📦 Deploying cloud-credentials function..."

npx supabase functions deploy cloud-credentials \
  --set GOOGLE_CLIENT_ID="$VITE_GOOGLE_CLIENT_ID" \
  --set GOOGLE_API_KEY="$GOOGLE_CLIENT_SECRET" \
  --set DROPBOX_APP_KEY="$VITE_DROPBOX_APP_KEY" \
  --set SUPABASE_URL="$VITE_SUPABASE_URL" \
  --set SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY"

if [ $? -eq 0 ]; then
    echo "✅ Cloud credentials function deployed successfully!"
    echo "🔗 Function URL: $VITE_SUPABASE_URL/functions/v1/cloud-credentials"
    echo ""
    echo "🧪 Test the function with:"
    echo "curl -X POST '$VITE_SUPABASE_URL/functions/v1/cloud-credentials' \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{\"action\": \"get_google_credentials\"}'"
else
    echo "❌ Failed to deploy cloud-credentials function"
    exit 1
fi
