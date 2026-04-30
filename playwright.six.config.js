import { defineConfig, devices } from '@playwright/test'

/** Full-trial smoke on existing dev stack: run `node dev-server.js` and `vite` (or `npm run dev:no-agent`) first. */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'six-full-trials.spec.js',
  fullyParallel: false,
  workers: 1,
  timeout: 1_800_000,
  expect: { timeout: 120_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
