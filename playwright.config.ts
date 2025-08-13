import { defineConfig, devices } from '@playwright/test';

/**
 * PIX DUPE DETECT - Comprehensive Playwright Configuration
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* Test organization */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  /* Advanced reporting */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }], 
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['line'],
    ...(process.env.CI ? [['github'] as const] : [])
  ],
  
  /* Global test configuration */
  use: {
    /* Application URL */
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    
    /* Browser settings */
    headless: process.env.CI ? true : (process.env.CODESPACES ? true : false),
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    /* Recording & debugging */
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    /* Timeouts */
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    /* Additional context */
    contextOptions: {
      // Simulate realistic browser usage
      permissions: ['clipboard-read', 'clipboard-write'],
    },
    
    /* Storage state for authenticated tests */
    storageState: process.env.STORAGE_STATE_PATH,
  },

  /* Multi-browser testing */
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    
    // Cleanup project
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/,
    },
    
    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use authenticated state
        storageState: 'tests/fixtures/auth-state.json',
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'tests/fixtures/auth-state.json',
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'tests/fixtures/auth-state.json',
      },
      dependencies: ['setup'],
    },

    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'tests/fixtures/auth-state.json',
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        storageState: 'tests/fixtures/auth-state.json',
      },
      dependencies: ['setup'],
    },

    // Branded browsers (optional)
    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge',
        storageState: 'tests/fixtures/auth-state.json',
      },
      dependencies: ['setup'],
    },
    
    // Unauthenticated tests
    {
      name: 'unauthenticated',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.unauth\.spec\.ts/,
    },
  ],

  /* Development server configuration */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NODE_ENV: 'test',
    },
  },

  /* Global configuration */
  timeout: 60000,
  expect: {
    timeout: 15000,
    toHaveScreenshot: { threshold: 0.3 },
    toMatchSnapshot: { threshold: 0.3 },
  },
  
  /* Test metadata */
  metadata: {
    'test-type': 'e2e',
    'app-name': 'PIX DUPE DETECT',
    'version': '1.0.0',
  },
});
