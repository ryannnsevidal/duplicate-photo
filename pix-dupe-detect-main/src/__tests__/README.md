# Testing Guide

## Test Categories

### @smoke Tests
Fast, essential tests that run in CI and cover core functionality:
- Basic authentication flow
- Perceptual hash generation
- Critical user interactions

### Integration Tests
Slower tests that require full environment setup:
- Cloud integration features
- Complex authentication flows
- File upload workflows

## Running Tests

```bash
# Run all tests
npm run test

# Run only smoke tests (fast, CI-safe)
npm run test:smoke

# Run tests with UI (development)
npm run test:ui

# Run specific test file
npx vitest src/__tests__/AuthForm.test.tsx
```

## CI Safety

Tests are configured to run safely in CI environments:
- Browser APIs are mocked for consistent behavior
- No external dependencies required
- Deterministic test data patterns
- Fast execution time for @smoke tests

## Test Writing Guidelines

1. **Use @smoke tag** for tests that should run in CI
2. **Mock external dependencies** (APIs, browser features)
3. **Use userEvent** instead of fireEvent for user interactions
4. **Await async operations** with findBy* queries
5. **Keep tests deterministic** with fixed test data

## Mocks Available

- `Image` constructor for image loading tests
- `createImageBitmap` for image processing
- `HTMLCanvasElement` and canvas context methods
- `OffscreenCanvas` for advanced image operations
- Browser storage APIs (localStorage, sessionStorage)