---
name: CI/CD Request
about: Request changes or report issues with CI/CD
labels: ci
---

## What changed or is needed?

- [ ] CI pipeline change
- [ ] Release workflow change
- [ ] Docker build
- [ ] Render deploy

## Details

Describe the change or issue clearly, including links to failing runs or logs.

## Acceptance Criteria

- [ ] CI green on PRs (lint, typecheck, unit, e2e, build)
- [ ] Release publishes images to GHCR on tag
- [ ] Optional Render deploy triggers (if secrets present)