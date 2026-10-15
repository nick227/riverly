import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5180'
const apiURL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001'

// Requires the demo seed: `pnpm db:seed -- --reset`
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: { baseURL, trace: 'on-first-retry', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: [
    { command: 'pnpm --filter server dev', url: `${apiURL}/health`, reuseExistingServer: !process.env.CI, stdout: 'ignore', stderr: 'pipe' },
    { command: 'pnpm --filter web dev', url: baseURL, reuseExistingServer: !process.env.CI, stdout: 'ignore', stderr: 'pipe' },
  ],
})
