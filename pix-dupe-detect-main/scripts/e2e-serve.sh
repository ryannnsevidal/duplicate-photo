#!/bin/bash

# E2E Test Runner with Auto-serve
# This script builds the app, serves it, and runs Playwright tests

set -e

echo "🔧 Building application..."
npm run build

echo "🚀 Starting server in background..."
npx http-server dist -p 5173 &
SERVER_PID=$!

# Give the server a moment to start
sleep 3

echo "🧪 Running E2E tests..."
npm run e2e || TEST_RESULT=$?

echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null || true

# Exit with test result
exit ${TEST_RESULT:-0}
