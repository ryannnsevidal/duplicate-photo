# Duplicate Photo Detector

A production-oriented project for detecting duplicate and similar photos with safe-delete (quarantine) workflow.

## Quickstart

- Web UI (static app):
  - Prereqs: Node 20+
  - Install and run in the UI app:
    - `cd pix-dupe-detect-main`
    - `npm ci`
    - `npm run dev`
  - Open: http://localhost:5173

- Worker/CLI (scanning, hashing) [alpha]:
  - Prereqs: Node 20+, Postgres (DATABASE_URL)
  - Copy `.env.example` to `.env` and set values
  - Install root deps: `npm ci`
  - Run migrations: `npm run migrate`

## CLI (alpha)

The CLI will support these commands:

- `dupe scan <path> [--concurrency 8] [--ext jpg,png,heic]`
- `dupe groups [--threshold 8] [--algo phash]`
- `dupe resolve --policy keep-highest-res`
- `dupe trash --restore --empty`

Status: commands are being implemented; see `scripts/` and `worker/` directories for the current logic and stubs.

## Safety: Quarantine, not delete

- Delete actions move files to a `TRASH_DIR` (quarantine) within the configured root.
- Restores are supported within a retention period. No hard-deletes by default.

## Environment variables

Configure locally via `.env` (dotenv). On Render, configure these as service environment variables.

- `DATABASE_URL`
- `DUPE_ROOT` (root directory allowed for scanning)
- `UPLOAD_DIR`
- `THUMBNAIL_DIR`
- `QUEUE_URL` (optional if using a queue)
- `MAX_CONCURRENCY` (default 8)
- `HASH_ALGO` (default `phash`)
- `SIMILARITY_THRESHOLD` (default 8)

See `.env.example` for the full list.

## Database

- Postgres schema and migrations live in `migrations/`
- Apply with `npm run migrate`
- Seed data (optional) with `npm run seed`

## Development

- Formatting: `npm run format`
- Linting: `npm run lint`
- Typecheck: `npm run type-check`
- Unit tests: `npm run test`
- E2E tests (web UI):
  - `cd pix-dupe-detect-main`
  - `npm run test:e2e`

## Render deployment

- See `render.yaml` for services:
  - Web (static) service for the UI under `pix-dupe-detect-main`
  - Worker service (optional) for background scanning
- CI deploy workflow triggers on version tags. Configure `RENDER_DEPLOY_HOOK_URL` secret in GitHub.

## Large files policy

- Large binaries should not be committed. Use Git LFS or GitHub Releases. Removed: `pix-dupe-detect-ready.zip`.

## License

MIT. See `LICENSE`.