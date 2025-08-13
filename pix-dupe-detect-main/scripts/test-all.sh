#!/usr/bin/env bash
set -euo pipefail
nvm use 20 >/dev/null || true
npm install
npx playwright install --with-deps
echo "🧪 Running unit/integration..."
npm run test
echo "🌐 Running E2E (build+serve+headless)..."
VITE_E2E_TEST_MODE=1 PW_WEB_SERVER=1 npm run e2e
echo "✅ All green."
E2E_STATUS=${PIPESTATUS[0]}
set -e

kill $SERVE_PID || true

if [ "$E2E_STATUS" -ne 0 ]; then
  echo "❌ E2E failed. If available, open Playwright report: playwright-report/index.html"
  exit $E2E_STATUS
fi

echo "✅ All tests passed. Coverage: coverage/index.html, E2E: playwright-report/index.html"
