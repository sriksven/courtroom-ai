import { defineConfig, devices } from '@playwright/test'

/** Dedicated port so e2e dev server does not collide with a developer's running Vite on 5173 */
const E2E_PORT = 4173
const E2E_ORIGIN = `http://127.0.0.1:${E2E_PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: E2E_ORIGIN,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev:frontend -- --port ${E2E_PORT} --strictPort --host 127.0.0.1`,
    url: E2E_ORIGIN,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
