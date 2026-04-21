import { defineConfig, devices } from '@playwright/test'

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.AGENT_AUTH_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000'

const IS_CI = !!process.env.CI
const START_WEB_SERVER = process.env.PLAYWRIGHT_START_WEB_SERVER === 'true'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  workers: IS_CI ? 2 : undefined,
  timeout: 30_000,
  expect: {
    timeout: 7_500
  },
  reporter: IS_CI
    ? [
        ['list'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['json', { outputFile: 'artifacts/playwright/results.json' }]
      ]
    : [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
  outputDir: 'test-results/playwright',
  use: {
    baseURL: BASE_URL,
    storageState: '.auth/storageState.json',
    trace: IS_CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
    video: IS_CI ? 'retain-on-failure' : 'off',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
      : undefined
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: START_WEB_SERVER
    ? {
        command: 'pnpm dev',
        url: BASE_URL,
        reuseExistingServer: !IS_CI,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe'
      }
    : undefined
})
