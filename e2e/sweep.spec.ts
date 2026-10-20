import { expect, test } from '@playwright/test'
import { trackConsoleErrors } from './helpers'

const ROUTES = ['/', '/overview', '/anomalies', '/anomalies/over-budget-2026-05', '/meters', '/meters/pool', '/budget', '/reports', '/preview', '/settings', '/more']

/** A cheap fingerprint of what the user can see. */
async function fingerprint(page: import('@playwright/test').Page) {
  return page.evaluate(() => `${location.pathname}${location.search}|${document.body.innerText.length}|${document.body.innerHTML.length}|${document.querySelector('dialog[open]') ? 'dialog' : ''}|${document.body.getAttribute('data-printed') ?? ''}`)
}

for (const route of ROUTES) {
  test(`every control on ${route} does something`, async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', 'sweep runs on desktop; flows cover mobile')
    test.setTimeout(240_000) // reloads the page once per control
    const done = trackConsoleErrors(page)
    await page.addInitScript(() => { window.print = () => document.body.setAttribute('data-printed', String(Date.now())) })
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    const controls = page.locator('main button:visible, main [role="radio"]:visible, main summary:visible, main a[href]:visible')
    const count = await controls.count()
    const dead: string[] = []
    for (let k = 0; k < count; k++) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const control = controls.nth(k)
      if (!(await control.isVisible()) || (await control.isDisabled().catch(() => false))) continue
      if ((await control.getAttribute('aria-checked')) === 'true') continue // already-selected radio
      if ((await control.getAttribute('aria-pressed')) === 'true') continue // already-active filter chip
      const name = (await control.innerText().catch(() => '')).trim() || (await control.getAttribute('aria-label')) || `#${k}`
      const before = await fingerprint(page)
      const chooser = page.waitForEvent('filechooser', { timeout: 400 }).then(() => true, () => false)
      await control.click()
      await page.waitForTimeout(150)
      const opened = await chooser
      if (!opened && (await fingerprint(page)) === before) dead.push(name)
    }
    expect(dead, `controls on ${route} that changed nothing`).toEqual([])
    done()
  })
}
