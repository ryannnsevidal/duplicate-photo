import { defineConfig, devices } from '@playwright/test'

const PORT = process.env.PORT || 4173

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: process.env.PW_WEB_SERVER
    ? {
        command: `npm run preview -- --port ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
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
