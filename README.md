# Monorepo - Battle-tested Context Engineering for Cursor

A production-ready monorepo setup with comprehensive testing, type safety, and AI-assisted development.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Generate types from OpenAPI
pnpm gen:types

# Start development
pnpm dev
```

## 📁 Project Structure

```
.
├── apps/                 # Deployable applications
│   ├── web/             # Next.js frontend (port 3000)
│   ├── api/             # Fastify backend (port 3001)
│   └── workers/         # Background job processors
├── packages/            # Shared packages
│   ├── config/          # Shared configurations
│   ├── ui/              # UI component library
│   ├── core/            # Business logic (pure functions)
│   ├── types/           # TypeScript types & API client
│   └── testing/         # Test utilities & factories
├── docs/                # Documentation
│   ├── adr/            # Architecture Decision Records
│   ├── guides/         # How-to guides
│   └── reference/      # API reference (OpenAPI)
└── .cursorrules        # AI assistant configuration
```

## 🧪 Testing Strategy

### Test Pyramid
- **Unit Tests (70%)**: Fast, focused tests for business logic
- **Integration Tests (20%)**: API endpoints with real databases
- **E2E Tests (10%)**: Critical user journeys

### Running Tests
```bash
pnpm test              # Run all tests
pnpm test:unit         # Unit tests only
pnpm test:int          # Integration tests
pnpm test:e2e          # End-to-end tests
pnpm test:watch        # Watch mode
```

## 🤖 AI-Powered Development

This repo is optimized for Cursor with context engineering:

### Cursor Rules (`.cursorrules`)
- Enforces test-first development
- Maintains API contracts
- Generates documentation
- Ensures type safety

### Prompt Templates (`.cursor-prompts/`)
- `feature.md` - Structured feature development
- `test-first.md` - TDD workflow
- `refactor-safe.md` - Safe refactoring with tests

### Usage Example
1. Open Cursor
2. Use prompt: `.cursor-prompts/feature.md`
3. Fill in the template variables
4. Let Cursor generate tests and implementation

## 🔧 Development

### Environment Setup
```bash
# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Start required services
docker-compose -f docker-compose.test.yml up -d
```

### Common Commands
```bash
pnpm dev               # Start all apps in dev mode
pnpm build             # Build all packages
pnpm lint              # Lint code
pnpm typecheck         # Type checking
pnpm format            # Format code
pnpm ci                # Run all checks (CI)
```

### Adding Dependencies
```bash
# Add to specific workspace
pnpm add --filter @app/web package-name

# Add dev dependency to root
pnpm add -D -w package-name
```

## 📝 API Development

### OpenAPI Workflow
1. Edit `/docs/reference/openapi.yaml`
2. Generate types: `pnpm gen:types`
3. Implement endpoints with type safety
4. Types automatically flow to frontend

### Type-Safe API Client
```typescript
import { createApiClient } from '@repo/types'

const api = createApiClient('http://localhost:3001')
const users = await api.listUsers({ page: 1 }, token)
```

## 🚢 CI/CD

GitHub Actions workflow includes:
- ✅ Linting & formatting
- ✅ Type checking
- ✅ Unit & integration tests
- ✅ E2E tests
- ✅ Security scanning
- ✅ Automated releases

## 📚 Documentation

- **[Getting Started](./docs/guides/getting-started.md)** - Setup guide
- **[Testing Guide](./docs/guides/testing.md)** - Testing patterns
- **[Contributing](./CONTRIBUTING.md)** - Contribution guidelines
- **[Architecture](./docs/adr/)** - Design decisions

## 🏗️ Architecture Decisions

Key decisions documented in `/docs/adr/`:
- Monorepo with pnpm workspaces
- Turborepo for build orchestration
- Vitest for testing
- OpenAPI for API contracts
- Testcontainers for integration tests

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Code standards
- Commit conventions
- PR process
- Testing requirements

## 📄 License

MIT

---

Built with ❤️ for efficient, AI-assisted development.