import { expect, test } from '@playwright/test'

/** UVP screens: name -> path. SHOT=<name> limits a run to one screen. */
export const SCREENS: [string, string][] = [
  ['ui-gallery', '/__ui'],
  ['upload', '/'],
  ['more', '/more'],
  ['overview', '/overview'],
  ['anomalies', '/anomalies'],
  ['detail', '/anomalies/over-budget-2026-05'],
  ['detail-estimated', '/anomalies/estimated-reads-2026-02'],
  ['detail-mismatch', '/anomalies/cost-mismatch-2025-12_2026-01'],
  ['detail-expected', '/anomalies/seasonal-shutdown-m7'],
  ['meters', '/meters'],
  ['meter-pool', '/meters/pool'],
  ['budget', '/budget'],
  ['reports', '/reports'],
  ['preview', '/preview'],
  ['settings', '/settings'],
]

for (const [name, path] of SCREENS) {
  test(`shot ${name}`, async ({ page }) => {
    test.skip(!!process.env.SHOT && process.env.SHOT !== name)
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(900)
    const { width, height } = page.viewportSize()!
    // Grow the viewport to the page height instead of fullPage: fullPage resizes
    // mid-capture, which drops the 3D lodge's HTML pin overlay from the image.
    const full = await page.evaluate(() => document.documentElement.scrollHeight)
    await page.setViewportSize({ width, height: Math.max(height, full) })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `verify/screenshots/${name}-${width}.png` })
    await page.setViewportSize({ width, height })
    // Compare with the emulated width, not innerWidth: mobile emulation widens the layout viewport to fit overflow.
    const overflow = (await page.evaluate(() => document.documentElement.scrollWidth)) - width
    expect(overflow, 'page scrolls horizontally').toBeLessThanOrEqual(0)
  })
}
