import { defineConfig } from '@playwright/test'
import nextEnv from '@next/env'
nextEnv.loadEnvConfig(process.cwd())
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: {
    storageState: process.env.TEST_STORAGE_STATE || undefined,
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    actionTimeout: 15000,
    headless: true,
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
})
