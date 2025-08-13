#!/usr/bin/env bash
set -euo pipefail
cmd="${1:-e2e}"
nvm use 20 >/dev/null || true
case "$cmd" in
  unit) npm run test ;;
  e2e)  VITE_E2E_TEST_MODE=1 PW_WEB_SERVER=1 npm run e2e ;;
  ui)   xvfb-run -a npm run e2e:ui ;;
  *)    echo "usage: $0 {unit|e2e|ui}" && exit 1 ;;
esac
    ;;
  debug)
    npx playwright install --with-deps >/dev/null
    npm run e2e:ui
    ;;
  auth)
    npx playwright install --with-deps >/dev/null
    npm run e2e -- -g "auth"
    ;;
  all|*)
    ./scripts/test-all.sh
    ;;
esac
