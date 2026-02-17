import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for testing against the deployed site.
 * No local webServer is started.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer — tests hit the deployed URL directly
});
