#!/usr/bin/env bash

# Production Deployment Verification Script
# Run this script to verify the app is ready for Render deployment

set -euo pipefail

echo "🔧 PIX DUPE DETECT - Production Deployment Check"
echo "=================================================="

# Check Node version
echo "📋 Checking Node.js version..."
node --version
if [[ $(node --version | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
  echo "❌ Node.js 18+ required. Current: $(node --version)"
  exit 1
fi
echo "✅ Node.js version is compatible"

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
  echo "❌ Must run from pix-dupe-detect-main directory"
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Check for critical files
echo "🔍 Checking critical files..."
for file in "vite.config.ts" "src/main.tsx" "src/App.tsx" "index.html"; do
  if [[ ! -f "$file" ]]; then
    echo "❌ Missing critical file: $file"
    exit 1
  fi
done
echo "✅ All critical files present"

# Test production build
echo "🏗️  Testing production build..."
VITE_E2E_TEST_MODE=0 npm run build

if [[ ! -d "dist" ]]; then
  echo "❌ Build failed - no dist directory created"
  exit 1
fi

if [[ ! -f "dist/index.html" ]]; then
  echo "❌ Build failed - no index.html in dist"
  exit 1
fi

echo "✅ Production build successful"

# Check bundle size
BUNDLE_SIZE=$(du -sh dist | cut -f1)
echo "📊 Bundle size: $BUNDLE_SIZE"

# Check for environment variables in built files
echo "🔐 Checking environment variable configuration..."
if grep -r "VITE_" dist/ > /dev/null; then
  echo "✅ Vite environment variables detected in build"
else
  echo "⚠️  No VITE_ environment variables found in build"
fi

# Verify Render configuration
echo "☁️  Checking Render configuration..."
if [[ -f "../render.yaml" ]]; then
  echo "✅ render.yaml found"
  
  # Check if it's properly configured for static site
  if grep -q "env: static" "../render.yaml"; then
    echo "✅ Configured as static site"
  else
    echo "❌ render.yaml not configured for static site"
    exit 1
  fi
  
  if grep -q "rootDir: pix-dupe-detect-main" "../render.yaml"; then
    echo "✅ Correct root directory specified"
  else
    echo "❌ Incorrect root directory in render.yaml"
    exit 1
  fi
  
  if grep -q "staticPublishPath: dist" "../render.yaml"; then
    echo "✅ Correct publish path specified"
  else
    echo "❌ Incorrect publish path in render.yaml"
    exit 1
  fi
  
  if grep -q "source: \"/\\*\"" "../render.yaml"; then
    echo "✅ SPA routing configured"
  else
    echo "❌ SPA routing not configured"
    exit 1
  fi
  
else
  echo "❌ render.yaml not found in parent directory"
  exit 1
fi

echo ""
echo "🎉 DEPLOYMENT READY!"
echo "===================="
echo ""
echo "✅ Node.js version: $(node --version)"
echo "✅ Build size: $BUNDLE_SIZE"
echo "✅ Static site configuration: OK"
echo "✅ SPA routing: Configured"
echo ""
echo "🚀 Ready to deploy to Render!"
echo ""
echo "Next steps:"
echo "1. Push this repository to GitHub"
echo "2. Create new Static Site on Render"
echo "3. Set environment variables:"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"
echo "   - NODE_VERSION=20"
echo "   - VITE_E2E_TEST_MODE=0"
echo "4. Configure rewrite rule: /* → /index.html"
echo ""
