import { describe, expect, it } from 'vitest'
import { compose } from '../../engine/compose'
import { SAMPLE_ROWS, SEASON_HDD } from '../../engine/sample'
import { DEFAULT_LABELS, type MeterId } from '../../engine/types'
import { buildingTones, makePins } from './pins'

const findings = compose(SAMPLE_ROWS, SEASON_HDD)
const label = (m: MeterId) => DEFAULT_LABELS[m]
const at = (month: string, f = findings) => Object.fromEntries(makePins({ findings: f, label, month, rows: SAMPLE_ROWS }).map((p) => [p.meter, p]))

describe('makePins follows the selected month', () => {
  it('May: the pool is high with a multiple and links to its flag', () => {
    const p = at('2026-05').pool
    expect(p.tone).toBe('high')
    expect(p.note).toMatch(/× normal$/)
    expect(p.href).toBe('/anomalies/over-budget-2026-05')
    expect(p.title).toMatch(/^Pool · May 2026 \$[\d,]+ · May was/)
  })
  it('December: meter 1 shows its drop-out, the pool is quiet', () => {
    const pins = at('2025-12')
    expect(pins.m1.tone).toBe('medium')
    expect(pins.m1.href).toMatch(/^\/anomalies\//)
    expect(pins.pool.tone).not.toBe('high')
    expect(pins.pool.note).toBeNull()
  })
  it('meter 7 is expected only in its shutdown months', () => {
    expect(at('2026-07').m7.tone).toBe('expected')
    expect(at('2026-02').m7.tone).toBe('ok')
  })
  it('quiet month: all ok, meter links', () => {
    for (const p of Object.values(at('2026-05', []))) {
      expect(p.tone).toBe('ok')
      expect(p.href).toBe(`/meters/${p.meter}`)
    }
  })
  it('tints the building that holds the worst pin', () => {
    const pins = makePins({ findings, label, month: '2025-12', rows: SAMPLE_ROWS })
    expect(buildingTones(pins)['west-mid']).toBe('medium')
  })
})
