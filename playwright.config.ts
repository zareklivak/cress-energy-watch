import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  reporter: [['list']],
  // Uses the installed Google Chrome. Set PW_CHANNEL=chromium after `npx playwright install chromium` to use the bundled browser.
  use: { baseURL: 'http://localhost:4173', channel: process.env.PW_CHANNEL ?? 'chrome' },
  webServer: { command: 'npm run build && npm run preview', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 180_000 },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } },
  ],
})
