import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { HEADER, trackConsoleErrors, uploadFile } from './helpers'

test('sample data runs the three steps and lands on the overview', async ({ page }) => {
  const done = trackConsoleErrors(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Use sample data' }).click()
  await expect(page.getByText('Learning normal')).toBeVisible()
  await expect(page).toHaveURL(/\/overview$/, { timeout: 10_000 })
  done()
})

const NORMALIZED = readFileSync('e2e/fixtures/normalized.json', 'utf8')

test('normalize error shows plain English', async ({ page }) => {
  // No console-error check: the mocked 422 itself logs "Failed to load resource" in Chrome.
  await page.route('**/api/normalize', (r) => r.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: "We couldn't find monthly gas readings in this file." }) }))
  await uploadFile(page, 'bill.pdf', '%PDF-1.4', 'application/pdf')
  await expect(page.getByRole('alert')).toHaveText("We couldn't find monthly gas readings in this file.")
  await uploadFile(page, 'notes.txt', 'hello', 'text/plain')
  await expect(page.getByRole('alert')).toHaveText('Cress reads CSV, Excel (.xlsx, .xls) and PDF files.')
  await expect(page.getByRole('button', { name: 'Use sample data' })).toBeVisible()
})

test('a messy file is read by AI, checked, then analyzed', async ({ page }) => {
  const done = trackConsoleErrors(page)
  await page.route('**/api/normalize', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: NORMALIZED }))
  await uploadFile(page, 'wrong.csv', 'month,boiler,pool\n2026-01,5,6\n')
  await expect(page.getByRole('heading', { name: 'Here’s what we read' })).toBeVisible()
  await expect(page.getByText('Meter names were read from the column headings.')).toBeVisible()
  await page.getByRole('button', { name: 'Use this data' }).click()
  await expect(page).toHaveURL(/\/overview$/)
  done()
})

test('clean Excel loads without the AI', async ({ page }) => {
  const done = trackConsoleErrors(page)
  let called = false
  await page.route('**/api/normalize', (r) => { called = true; return r.abort() })
  const csv = [HEADER, '2026-06,1000,1100,1200,1300,1400,1500,1600,1700,10800,0.06,648,648,700', '2026-07,1010,1110,1210,1310,1410,1510,1610,1710,10880,0.06,653,653,700', '2026-08,990,1090,1190,1290,1390,1490,1590,1690,10720,0.06,643,643,700'].join('\n')
  const book = XLSX.read(csv, { type: 'string' })
  const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  await page.goto('/')
  await page.getByLabel('Choose a utility file').setInputFiles({ name: 'gas.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer })
  await expect(page).toHaveURL(/\/overview$/)
  expect(called).toBe(false)
  done()
})

test('a short clean CSV renders normal states', async ({ page }) => {
  const done = trackConsoleErrors(page)
  // Values vary month to month: identical rows would (correctly) trip the copied-month rule.
  const rows = [
    '2026-06,1000,1100,1200,1300,1400,1500,1600,1700,10800,0.06,648,648,700',
    '2026-07,1010,1110,1210,1310,1410,1510,1610,1710,10880,0.06,653,653,700',
    '2026-08,990,1090,1190,1290,1390,1490,1590,1690,10720,0.06,643,643,700',
  ]
  await uploadFile(page, 'quiet.csv', [HEADER, ...rows].join('\n'))
  await expect(page).toHaveURL(/\/overview$/, { timeout: 10_000 })
  await expect(page.locator('body')).not.toContainText('NaN')
  await expect(page.locator('body')).not.toContainText('undefined')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('August looks normal.')
  await expect(page.getByText('No open flags. Nice.')).toBeVisible()
  done()
})

test('overview tells the May story and switches months', async ({ page }) => {
  const done = trackConsoleErrors(page)
  await page.goto('/overview')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^May's gas bill was [\d.]+× budget, and the pool explains most of it\.$/)
  await expect(page.getByText('Pool was the only meter outside its normal range.')).toBeVisible()
  await page.getByRole('button', { name: 'Next month' }).click()
  await page.getByRole('button', { name: 'Next month' }).click()
  await page.getByRole('button', { name: 'Next month' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("August's numbers look copied from July.")
  await page.getByRole('radio', { name: 'cu ft' }).click()
  await expect(page.getByRole('radio', { name: 'cu ft' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('link', { name: /See the flag/ }).click()
  await expect(page).toHaveURL(/\/anomalies\/repeat-month-2026-08$/)
  done()
})

test('inbox filters and the expected group', async ({ page }) => {
  const done = trackConsoleErrors(page)
  await page.goto('/anomalies')
  const cards = page.locator('main a[href^="/anomalies/"]:visible')
  await expect(cards).toHaveCount(8)
  await page.getByRole('group', { name: 'Filter by severity' }).getByRole('button', { name: 'High' }).click()
  await expect(cards).toHaveCount(1)
  await page.getByLabel('Type').selectOption({ label: 'Copied month' })
  await expect(page.getByText('No flags match these filters.')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await page.getByLabel('Meter', { exact: true }).selectOption({ label: 'Meter 1' })
  await expect(cards).toHaveCount(3) // drop-out, entry error, and February's estimated reads
  await page.getByText('Expected (1)').click()
  await expect(page.getByText('Expected: meter 7 seasonal shutdown')).toBeVisible()
  done()
})

test('detail: task, note, expected, resolve and prev/next', async ({ page }) => {
  const done = trackConsoleErrors(page)
  await page.goto('/anomalies/over-budget-2026-05')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^May was [\d.]+× budget: pool gas [\d.]+× normal$/)
  await page.getByRole('button', { name: 'Create task' }).click()
  await page.getByLabel('Who').fill('Maintenance lead')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText(/^Task: Check the pool heater/)).toBeVisible()
  await expect(page.getByText('Reviewing').first()).toBeVisible()
  await page.getByRole('button', { name: 'Add note' }).click()
  await page.getByRole('textbox', { name: 'Note' }).fill('Called the pool contractor')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Called the pool contractor')).toBeVisible()
  await page.getByRole('button', { name: 'Mark expected' }).click()
  await page.getByLabel('Why is this expected?').fill('Spring event')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Marked expected: Spring event')).toBeVisible()
  await page.getByRole('button', { name: 'Reopen' }).click()
  await page.getByRole('button', { name: 'Mark resolved' }).click()
  await expect(page.getByText('Status changed to Resolved')).toBeVisible()
  await page.getByRole('button', { name: 'Next flag' }).click()
  await expect(page).toHaveURL(/\/anomalies\/estimated-reads-2026-02$/)
  await expect(page.getByText('Estimated?')).toBeVisible()
  done()
})

test('deep link and unknown id', async ({ page }) => {
  const done = trackConsoleErrors(page)
  await page.goto('/anomalies/entry-error-2026-07-m1')
  await expect(page.getByText(/The bill is \$[\d,]+ lower than expected/)).toBeVisible()
  await page.goto('/anomalies/does-not-exist')
  await expect(page.getByText("This flag isn't in the current data.")).toBeVisible()
  await page.getByRole('link', { name: 'Back to the overview' }).click()
  await expect(page).toHaveURL(/\/overview$/)
  done()
})

test('meters: scale toggle and meter page', async ({ page }) => {
  const done = trackConsoleErrors(page)
  await page.goto('/meters')
  await expect(page.getByText(/^Pool used \d+% of all gas this season$/)).toBeVisible()
  await page.getByRole('radio', { name: 'Own scale' }).click()
  await expect(page.getByRole('radio', { name: 'Own scale' })).toHaveAttribute('aria-checked', 'true')
  await page.locator('a[href="/meters/m7"]').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Meter 7')
  await expect(page.getByText('Expected: meter 7 seasonal shutdown')).toBeVisible()
  await page.goto('/meters/nope')
  await expect(page.getByText("We don't have a meter by that name.")).toBeVisible()
  done()
})

test('budget: view toggle and export calls print', async ({ page }) => {
  const done = trackConsoleErrors(page)
  await page.addInitScript(() => { window.print = () => document.body.setAttribute('data-printed', 'yes') })
  await page.goto('/budget')
  await expect(page.getByText(/The proposed budget is \$[\d.]+K/)).toBeVisible()
  await page.getByRole('radio', { name: 'Table' }).click()
  await expect(page.getByRole('cell', { name: 'May 2026' })).toBeVisible()
  await page.getByRole('button', { name: 'Export for board packet' }).click()
  await expect(page.locator('body')).toHaveAttribute('data-printed', 'yes')
  done()
})

test('report: actions taken appear, export prints', async ({ page }) => {
  const done = trackConsoleErrors(page)
  await page.addInitScript(() => { window.print = () => document.body.setAttribute('data-printed', 'yes') })
  await page.goto('/anomalies/over-budget-2026-05')
  await page.getByRole('button', { name: 'Add note' }).click()
  await page.getByRole('textbox', { name: 'Note' }).fill('Heater inspection booked')
  await page.getByRole('button', { name: 'Save' }).click()
  // Navigate in-app: a reload would reset the session (and the note).
  if (page.viewportSize()!.width < 640) {
    await page.getByRole('link', { name: 'More' }).click()
    await page.getByRole('link', { name: 'Reports' }).click()
  } else {
    await page.getByRole('link', { name: 'Reports' }).first().click()
  }
  await expect(page.getByText('Monthly gas report, May 2026')).toBeVisible()
  await expect(page.getByText(/Heater inspection booked/)).toBeVisible()
  await page.getByRole('button', { name: 'Export PDF' }).click()
  await expect(page.locator('body')).toHaveAttribute('data-printed', 'yes')
  done()
})

test('print media hides chrome', async ({ page }) => {
  await page.goto('/reports')
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('navigation', { name: 'Main' }).first()).toBeHidden()
  await expect(page.getByRole('button', { name: 'Export PDF' })).toBeHidden()
  await expect(page.getByText('Monthly gas report, May 2026')).toBeVisible()
})

test('preview is clearly labeled and not counted', async ({ page }) => {
  await page.goto('/preview')
  await expect(page.getByRole('note')).toContainText('Preview with sample values')
  await expect(page.getByText('Sample values', { exact: true })).toHaveCount(3)
  await page.goto('/anomalies')
  await expect(page.getByText('Boiler 2 turning on and off too often overnight')).toHaveCount(0)
})

test('long meter label carries through without overflow', async ({ page }) => {
  const done = trackConsoleErrors(page)
  await page.goto('/settings')
  const long = 'Boiler room east wing hot-water loop 12'
  await page.getByLabel('Meter 7').fill(long)
  await page.getByLabel('Pool', { exact: true }).fill('Pool & spa')
  // In-app navigation keeps session state (a reload would reset it).
  await page.getByRole('link', { name: 'Anomalies' }).first().click()
  await page.getByText('Expected (1)').click()
  await expect(page.getByText(`Expected: boiler room east wing hot-water loop 12 seasonal shutdown`)).toBeVisible()
  await expect(page.getByText(/May was [\d.]+× budget: pool & spa gas [\d.]+× normal/)).toBeVisible()
  for (const path of ['/anomalies', '/meters']) {
    await page.getByRole('link', { name: path === '/anomalies' ? 'Anomalies' : 'Meters' }).first().click()
    // Compare with the emulated viewport, not innerWidth: mobile emulation widens the
    // layout viewport to fit overflowing content, so innerWidth would hide the overflow.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(page.viewportSize()!.width)
  }
  done()
})

test('how-to card explains the demo and stays dismissed', async ({ page }) => {
  await page.goto('/overview')
  const card = page.getByRole('region', { name: 'How this works' })
  await card.getByRole('button', { name: /How this works/ }).click()
  await expect(card).toContainText('connect straight to your building')
  await page.getByRole('button', { name: 'Hide how this works' }).click()
  await expect(card).toBeHidden()
  await page.reload()
  await expect(page.getByRole('region', { name: 'How this works' })).toBeHidden()
})

test('site map: pins follow the month and open the right page', async ({ page }) => {
  const done = trackConsoleErrors(page)
  const phone = page.viewportSize()!.width < 640
  const role = phone ? 'link' : 'button'
  await page.goto('/overview')
  const pool = page.getByRole(role, { name: /^Pool · May 2026 \$[\d,]+ · May was/ }).first()
  await expect(pool).toBeVisible({ timeout: 15_000 }) // the 3D scene loads lazily
  for (let k = 0; k < 5; k++) await page.getByRole('button', { name: 'Previous month' }).first().click()
  await expect(page.getByRole(role, { name: /^Pool · December 2025/ }).first()).toBeVisible()
  const m1 = page.getByRole(role, { name: /^Meter 1 · December 2025/ }).first()
  await m1.focus()
  await m1.press('Enter')
  await expect(page).toHaveURL(/\/anomalies\//)
  done()
})

test('site map: expands into a large view', async ({ page }) => {
  await page.goto('/overview')
  await page.getByRole('button', { name: 'Expand map' }).click()
  const dialog = page.getByRole('dialog', { name: /^Site map · May 2026$/ })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('High flag')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('pins carry renamed labels', async ({ page }) => {
  const phone = page.viewportSize()!.width < 640
  await page.goto('/settings')
  await page.getByLabel('Pool', { exact: true }).fill('PoolAndSpaHeaterNorthWingBuildingA2026')
  await page.getByRole('link', { name: 'Overview' }).first().click()
  await expect(page.getByRole(phone ? 'link' : 'button', { name: /^PoolAndSpaHeaterNorthWingBuildingA2026 · May 2026/ }).first()).toBeVisible({ timeout: 15_000 }) // 3D loads lazily
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
})

test('overview leads with what to do, grouped by action', async ({ page }) => {
  const done = trackConsoleErrors(page)
  await page.goto('/overview')
  await expect(page.getByRole('heading', { name: 'What to do' })).toBeVisible()
  await expect(page.getByText(/^\$[\d,]+$/).first()).toBeVisible()
  await page.getByRole('link', { name: /See billing flags/ }).click()
  await expect(page).toHaveURL(/\/anomalies#utility$/)
  await expect(page.getByRole('heading', { name: /^Check bills with the utility/ })).toBeVisible()
  done()
})
