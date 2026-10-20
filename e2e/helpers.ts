import { expect, type Page } from '@playwright/test'

/** Fails the test at the end if the page logged any console error. */
export function trackConsoleErrors(page: Page): () => void {
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(e.message))
  return () => expect(errors, 'console errors').toEqual([])
}

export async function uploadFile(page: Page, name: string, content: string, mimeType = 'text/csv') {
  await page.goto('/')
  await page.getByLabel('Choose a utility file').setInputFiles({ name, mimeType, buffer: Buffer.from(content) })
}

export const HEADER = 'month,m3,m7,m1,m2,pool,m4,m5,m6,total_cuft,rate,calc_cost,alt_cost,budget'
