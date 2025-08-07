# Test Fixtures

This directory contains test files and fixtures used by the E2E test suite.

## Sample Images

- `sample-image.jpg` - Small test image for upload testing
- `sample-image-2.jpg` - Second test image for multiple upload testing
- `large-image.jpg` - Large file for size validation testing

## Authentication States

- `auth-state.json` - Authenticated user session state
- `admin-auth-state.json` - Admin user session state

## Test Data

- `test-data.json` - Sample data for API testing
- `mock-responses.json` - Mock API responses for offline testing

## Usage

These fixtures are automatically used by the Playwright test suite. The setup tests create authentication state files that are reused across test runs for better performance.
