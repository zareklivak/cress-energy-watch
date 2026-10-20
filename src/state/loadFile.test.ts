import { describe, expect, it } from 'vitest'
import { SAMPLE_CSV } from '../engine/sample'
import { readUpload, UploadError } from './loadFile'
import type { NormalizedResult } from '../engine/normalized'

const file = (name: string, body: BlobPart, type = '') => new File([body], name, { type })
const never = async (): Promise<NormalizedResult> => { throw new Error('should not call the AI') }
const aiRow = (month: string) => ({ month, m3: 1000, m7: 1000, m1: 1000, m2: 1000, pool: 1000, m4: 1000, m5: 1000, m6: 1000, total_cuft: 8000, rate: 0.06, calc_cost: 480, billed: 480, budget: 500 })

describe('readUpload', () => {
  it('a clean CSV is ready with no AI call', async () => {
    const out = await readUpload(file('gas.csv', SAMPLE_CSV, 'text/csv'), never)
    expect(out.kind).toBe('ready')
  })

  it('a messy CSV goes to the AI and comes back for a check', async () => {
    const out = await readUpload(file('messy.csv', 'Month;Pool\nJan;5'), async (req) => {
      expect(req.kind).toBe('csv')
      return { rows: ['2026-01', '2026-02', '2026-03'].map(aiRow), notes: ['Semicolons read as columns.'] }
    })
    expect(out.kind).toBe('check')
    if (out.kind === 'check') {
      expect(out.dataset.rows).toHaveLength(3)
      expect(out.dataset.readByAi).toBe(true)
      expect(out.notes).toEqual(['Semicolons read as columns.'])
    }
  })

  it('malformed AI rows become a plain error', async () => {
    await expect(readUpload(file('bill.pdf', '%PDF-1.4', 'application/pdf'), async () => ({ rows: [aiRow('2026-01')], notes: [] })))
      .rejects.toThrow("We couldn't read monthly gas readings from this file.")
  })

  it('rejects files over 3 MB and unknown types', async () => {
    await expect(readUpload(file('big.pdf', new Uint8Array(3_000_001)), never)).rejects.toBeInstanceOf(UploadError)
    await expect(readUpload(file('notes.txt', 'hi'), never)).rejects.toThrow('Cress reads CSV, Excel (.xlsx, .xls) and PDF files.')
  })
})
