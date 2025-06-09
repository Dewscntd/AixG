import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for FootAnalytics E2E Tests
 * Comprehensive browser testing setup with multiple environments
 */
export default defineConfig({
  // Test directory
  testDir: './test/e2e',
  
  // Global setup and teardown
  globalSetup: './test/setup/e2e-global-setup.ts',
  globalTeardown: './test/setup/e2e-global-teardown.ts',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'test-results/playwright-report' }],
    ['junit', { outputFile: 'test-results/playwright-junit.xml' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['line']
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Global test timeout
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Test against mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Test against branded browsers
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: process.env.CI ? undefined : {
    command: 'npm run start:frontend',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // Test timeout
  timeout: 60000,
  
  // Expect timeout
  expect: {
    timeout: 10000,
  },
  
  // Output directory for test artifacts
  outputDir: 'test-results/playwright-artifacts',
  
  // Maximum time one test can run for
  globalTimeout: process.env.CI ? 600000 : 300000, // 10 minutes on CI, 5 minutes locally
});
