import { defineConfig, devices } from '@playwright/test'

const PORT = process.env.PORT || 4173

export default defineConfig({
  testDir: './',
  testMatch: [
    'tests/**/*.spec.ts',
    'e2e/**/*.spec.ts'
  ],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: process.env.PW_WEB_SERVER
    ? {
        command: `bash -lc "VITE_E2E_TEST_MODE=1 npm run build && npm run preview -- --port ${PORT}"`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          VITE_E2E_TEST_MODE: '1'
        }
      }
    : undefined,
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
});
