# Getting Started

Welcome to the monorepo! This guide will help you set up your development environment and start building.

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker (for running tests with real databases)
- Git

## Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Generate types from OpenAPI**
   ```bash
   pnpm gen:types
   ```

4. **Set up environment variables**
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

5. **Start development servers**
   ```bash
   pnpm dev
   ```

   This starts:
   - Web app: http://localhost:3000
   - API server: http://localhost:3001
   - Workers: Running in background

## Development Workflow

### Running Tests

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests (requires Docker)
pnpm test:int

# Run E2E tests
pnpm test:e2e

# Watch mode for development
pnpm test:watch
```

### Code Quality

```bash
# Lint code
pnpm lint

# Type checking
pnpm typecheck

# Format code
pnpm format

# All checks (runs in CI)
pnpm ci
```

### Building

```bash
# Build all packages
pnpm build

# Build specific app
pnpm build --filter=@app/web
```

## Project Structure

```
.
├── apps/                 # Deployable applications
│   ├── web/             # Next.js frontend
│   ├── api/             # Backend API
│   └── workers/         # Background jobs
├── packages/            # Shared packages
│   ├── config/          # Shared configurations
│   ├── ui/              # UI component library
│   ├── core/            # Business logic
│   ├── types/           # TypeScript types & API client
│   └── testing/         # Test utilities
├── docs/                # Documentation
│   ├── adr/            # Architecture decisions
│   ├── guides/         # How-to guides
│   └── reference/      # API reference
└── .cursorrules        # AI assistant rules
```

## Common Tasks

### Adding a New Feature

1. Use the Cursor prompt:
   ```
   .cursor-prompts/feature.md
   ```

2. Follow TDD approach:
   ```
   .cursor-prompts/test-first.md
   ```

### Updating API

1. Edit `/docs/reference/openapi.yaml`
2. Regenerate types: `pnpm gen:types`
3. Update implementations to match new types

### Creating a New Package

```bash
mkdir packages/new-package
cd packages/new-package
pnpm init
```

Add to `tsconfig.json`:
```json
{
  "extends": "@repo/config/tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  }
}
```

## Troubleshooting

### Tests failing with database errors

Make sure Docker is running:
```bash
docker-compose -f docker-compose.test.yml up -d
```

### Type errors after API changes

Regenerate types:
```bash
pnpm gen:types
```

### Build cache issues

Clear Turbo cache:
```bash
pnpm clean
pnpm install
```

## Next Steps

- Read the [Architecture Overview](./architecture.md)
- Check out [Testing Guide](./testing.md)
- Review [API Documentation](/docs/reference/openapi.yaml)
- Explore [Code Examples](./examples/)