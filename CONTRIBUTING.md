# Contributing

Thanks for helping improve Duplicate Photo Detector!

## Prerequisites

- Node 20+
- npm 10+
- Postgres (locally via Docker or cloud), if working on persistence

## Getting started

- Clone the repo and install dependencies:
  - UI: `cd pix-dupe-detect-main && npm ci`
  - Root (worker/cli/migrations): `cd .. && npm ci`
- Create a feature branch from `main`

## Development workflow

- Format: `npm run format`
- Lint: `npm run lint`
- Typecheck: `npm run type-check`
- Tests:
  - Unit: `npm run test`
  - E2E (web UI): `cd pix-dupe-detect-main && npm run test:e2e`

## Commit style

- Keep commits focused and descriptive
- Reference issues where applicable

## Pull Requests

- PRs must pass CI: typecheck, lint, unit tests, and e2e (as applicable)
- Add/update README when changing user-facing flows
- For schema changes, include a migration in `migrations/` and update seed if needed

## Code style

- TypeScript with explicit types on exports/public APIs
- Prefer early returns, handle errors explicitly, avoid deep nesting
- Use meaningful names; avoid abbreviations

## Security & safety

- Never hard-delete files; use quarantine (trash) flows
- Protect against path traversal; never operate outside `DUPE_ROOT`
- Do not follow symlinks by default