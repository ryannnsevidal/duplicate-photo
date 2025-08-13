import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.', // we'll match tests below
  testMatch: [
    'e2e/**/*.spec.ts',
    'tests/**/*.spec.ts',
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    headless: true, // ✅ runs in Codespaces without X server
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // Optional: auto-serve your built app for E2E
  webServer: process.env.PW_WEB_SERVER
    ? {
        command: 'npm run build && npx http-server dist -p 5173',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      }
    : undefined,
});
