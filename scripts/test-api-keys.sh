#!/bin/bash

# 🔧 API Keys Test Script
# Run this after adding each set of API keys

echo "🔍 Testing API Key Configuration..."

# Test Supabase Connection
echo ""
echo "🚀 Testing Supabase..."
if [[ $VITE_SUPABASE_URL == *"demo-project"* ]]; then
    echo "❌ Still using demo Supabase URL"
    echo "   👉 Add your real Supabase URL to .env"
else
    echo "✅ Supabase URL configured"
fi

if [[ $VITE_SUPABASE_ANON_KEY == *"demo-anon-key"* ]]; then
    echo "❌ Still using demo Supabase key"
    echo "   👉 Add your real Supabase anon key to .env"
else
    echo "✅ Supabase anon key configured"
fi

# Test Google OAuth
echo ""
echo "🔐 Testing Google OAuth..."
if [[ $VITE_GOOGLE_CLIENT_ID == *"your-google"* ]]; then
    echo "❌ Google Client ID not configured"
    echo "   👉 Get from Google Cloud Console"
else
    echo "✅ Google Client ID configured"
fi

# Test Dropbox
echo ""
echo "☁️ Testing Dropbox..."
if [[ $VITE_DROPBOX_APP_KEY == *"your-dropbox"* ]]; then
    echo "❌ Dropbox App Key not configured"
    echo "   👉 Get from Dropbox Developers"
else
    echo "✅ Dropbox App Key configured"
fi

# Test reCAPTCHA
echo ""
echo "🛡️ Testing reCAPTCHA..."
if [[ $VITE_RECAPTCHA_SITE_KEY == *"your-recaptcha"* ]]; then
    echo "⚠️ reCAPTCHA not configured (optional)"
else
    echo "✅ reCAPTCHA configured"
fi

# Test Sentry
echo ""
echo "📊 Testing Sentry..."
if [[ $VITE_SENTRY_DSN == *"your-sentry"* ]]; then
    echo "⚠️ Sentry not configured (optional)"
else
    echo "✅ Sentry configured"
fi

echo ""
echo "🔥 Next Steps:"
echo "1. Add missing API keys to .env file"
echo "2. Restart dev server: npm run dev"
echo "3. Test features at http://localhost:8080"

# Test server status
echo ""
echo "🌐 Testing development server..."
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Dev server is running"
    echo "   👉 Open http://localhost:8080"
else
    echo "❌ Dev server not running"
    echo "   👉 Run: npm run dev"
fi
