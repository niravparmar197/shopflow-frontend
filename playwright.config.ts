import { defineConfig, devices } from '@playwright/test';

// Runs against the PRODUCTION build (npm run build), served like production by
// scripts/serve.mjs. The gateway is mocked per test with page.route('/v1/...').
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:8080', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node scripts/serve.mjs',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    env: { PORT: '8080', SHOPFLOW_API: 'http://127.0.0.1:9' },
  },
});
