# Testing Guide

This guide covers testing patterns and best practices for the monorepo.

## Testing Philosophy

- **Test behavior, not implementation**
- **Write tests first (TDD)**
- **Keep tests fast and deterministic**
- **Use real dependencies when practical**

## Test Types

### Unit Tests

Located next to source files or in `__tests__` directories.

```typescript
// packages/core/src/user.service.test.ts
import { describe, it, expect } from 'vitest'
import { UserService } from './user.service'
import { createUser } from '@repo/testing'

describe('UserService', () => {
  describe('createUser', () => {
    it('should hash password before saving', async () => {
      const service = new UserService()
      const userData = createUser({ password: 'plain-text' })
      
      const result = await service.create(userData)
      
      expect(result.password).not.toBe('plain-text')
      expect(result.password).toMatch(/^\$2[aby]\$/)
    })
  })
})
```

### Integration Tests

Test multiple components working together with real dependencies.

```typescript
// apps/api/__tests__/users.integration.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { setupIntegrationTests } from '@repo/testing'
import { createApp } from '../src/app'
import supertest from 'supertest'

setupIntegrationTests() // Sets up test containers

describe('POST /users', () => {
  let app: any
  let request: any

  beforeAll(async () => {
    app = await createApp()
    request = supertest(app)
  })

  it('should create user and return 201', async () => {
    const response = await request
      .post('/users')
      .send({
        email: 'test@example.com',
        name: 'Test User',
        password: 'secure-password'
      })

    expect(response.status).toBe(201)
    expect(response.body).toMatchApiSchema()
    expect(response.body.data.email).toBe('test@example.com')
  })
})
```

### E2E Tests

Test complete user journeys across the full stack.

```typescript
// apps/web/__tests__/auth.e2e.test.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('user can sign up, log in, and access dashboard', async ({ page }) => {
    // Sign up
    await page.goto('/signup')
    await page.fill('[name="email"]', 'newuser@example.com')
    await page.fill('[name="password"]', 'secure-password')
    await page.click('button[type="submit"]')
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('Welcome')
    
    // Log out
    await page.click('button:has-text("Logout")')
    await expect(page).toHaveURL('/login')
    
    // Log back in
    await page.fill('[name="email"]', 'newuser@example.com')
    await page.fill('[name="password"]', 'secure-password')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('/dashboard')
  })
})
```

## Testing Patterns

### Using Test Factories

```typescript
import { createUser, createProduct, UserBuilder } from '@repo/testing'

// Simple factory
const user = createUser({ email: 'custom@example.com' })

// Builder pattern for complex scenarios
const admin = new UserBuilder()
  .withEmail('admin@example.com')
  .asAdmin()
  .verified()
  .build()

// Batch creation
const products = createProducts(10)
```

### Testing with Real Databases

```typescript
import { setupTestDatabase, clearDatabase } from '@repo/testing'

describe('Repository Tests', () => {
  setupIntegrationTests() // Starts Postgres container

  beforeEach(async () => {
    await clearDatabase()
  })

  it('should persist and retrieve data', async () => {
    // Your test with real database
  })
})
```

### Mocking External Services

```typescript
import { mockFetch } from '@repo/testing'

describe('External API Integration', () => {
  it('should handle third-party API', async () => {
    mockFetch({
      'https://api.example.com/data': {
        status: 200,
        body: { result: 'success' }
      }
    })

    const result = await fetchExternalData()
    expect(result).toEqual({ result: 'success' })
  })
})
```

### Time-based Testing

```typescript
import { mockDate } from '@repo/testing'

describe('Subscription Service', () => {
  it('should expire after 30 days', () => {
    const restore = mockDate('2024-01-01')
    
    const subscription = createSubscription()
    expect(subscription.isActive()).toBe(true)
    
    // Travel 31 days forward
    mockDate('2024-02-01')
    expect(subscription.isActive()).toBe(false)
    
    restore() // Restore real time
  })
})
```

## Best Practices

### 1. Test Organization

```
feature/
├── feature.service.ts
├── feature.service.test.ts    # Unit tests
├── feature.controller.ts
└── __tests__/
    └── feature.integration.test.ts  # Integration tests
```

### 2. Test Naming

```typescript
// ✅ Good: Describes behavior
it('should return 404 when user does not exist', ...)

// ❌ Bad: Describes implementation
it('should call findById with the id parameter', ...)
```

### 3. Arrange-Act-Assert

```typescript
it('should calculate total with tax', () => {
  // Arrange
  const items = [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 1 }
  ]
  const taxRate = 0.1

  // Act
  const total = calculateTotal(items, taxRate)

  // Assert
  expect(total).toBe(275) // (200 + 50) * 1.1
})
```

### 4. Avoid Test Interdependence

```typescript
// ❌ Bad: Tests depend on order
let user: User

it('should create user', () => {
  user = createUser()
})

it('should update user', () => {
  updateUser(user) // Depends on previous test
})

// ✅ Good: Independent tests
it('should update user', () => {
  const user = createUser() // Setup within test
  updateUser(user)
})
```

### 5. Use Custom Matchers

```typescript
// Custom matchers for better assertions
expect(response).toHaveStatus(200)
expect(id).toBeValidUUID()
expect(price).toBeWithinRange(0, 1000)
expect(response.body).toMatchApiSchema()
```

## Performance Testing

```typescript
import { measurePerformance } from '@repo/testing'

it('should complete within performance budget', async () => {
  await measurePerformance(
    'user search',
    async () => {
      await searchUsers({ query: 'test', limit: 100 })
    },
    100 // ms threshold
  )
})
```

## Debugging Tests

### Run single test file
```bash
pnpm test path/to/test.ts
```

### Run tests matching pattern
```bash
pnpm test -t "should create user"
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Test",
  "autoAttachChildProcesses": true,
  "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
  "args": ["run", "${file}"],
  "smartStep": true,
  "console": "integratedTerminal"
}
```

## Coverage Requirements

- Minimum 80% line coverage
- 100% coverage for business logic in `/packages/core`
- Focus on meaningful coverage, not just numbers

View coverage report:
```bash
pnpm test:coverage
open coverage/index.html
```

## Common Issues

### Flaky Tests

1. **Use deterministic data**: Use factories with seeds
2. **Control time**: Use `mockDate()` for time-dependent tests
3. **Wait properly**: Use `waitFor()` instead of arbitrary delays
4. **Isolate tests**: Clear database between tests

### Slow Tests

1. **Parallelize**: Tests run in parallel by default
2. **Use test containers sparingly**: Share containers when possible
3. **Mock heavy operations**: File I/O, network calls
4. **Profile tests**: Use `--reporter=verbose` to find slow tests

### Test Maintenance

1. **Keep tests simple**: One concept per test
2. **Use helpers**: Extract common setup/assertions
3. **Update with code**: Tests are first-class code
4. **Delete obsolete tests**: Don't keep dead code