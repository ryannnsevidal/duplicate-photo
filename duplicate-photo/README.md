# duplicate-photo

![CI](https://github.com/${OWNER}/${REPO}/actions/workflows/ci.yml/badge.svg)
![Release](https://github.com/${OWNER}/${REPO}/actions/workflows/release.yml/badge.svg)

A Node/TypeScript monorepo for duplicate photo detection.

## CI/CD

- Run CI locally:
  - `pnpm lint && pnpm -s tsc && pnpm test && pnpm build && pnpm test:e2e`
- Cut a release:
  - `git tag vX.Y.Z && git push origin vX.Y.Z`
- Optional deployment secrets (set in GitHub → Settings → Secrets and variables → Actions):
  - `GHCR_PAT` (optional; if omitted, uses `GITHUB_TOKEN`)
  - `RENDER_API_KEY`
  - `RENDER_SERVICE_ID_API`
  - `RENDER_SERVICE_ID_WORKER` (optional)

On PRs to `main`, CI runs lint, typecheck, unit tests, e2e (warn-only), and build across Node 18/20. On tag `v*.*.*`, Docker images for API and Worker are pushed to GHCR with version and SHA tags, and Render deploys are triggered if secrets are configured.