#!/usr/bin/env bash
set -euo pipefail
echo "### Changes" > CHANGES.md
git log --pretty=format:'- %h %s' $(git describe --tags --abbrev=0 2>/dev/null || echo "")..HEAD >> CHANGES.md