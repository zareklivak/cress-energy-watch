import { describe, expect, it } from 'vitest'
import { normalizedToCsv, type NormalizedRow } from './normalized'
import { parseCsv, ParseError } from './parse'

const row = (month: string, v = 1000): NormalizedRow => ({
  month, m3: v, m7: v, m1: v, m2: v, pool: v, m4: v, m5: v, m6: v,
  total_cuft: v * 8, rate: 0.06, calc_cost: Math.round(v * 8 * 0.06), billed: Math.round(v * 8 * 0.06), budget: 600,
})

describe('normalizedToCsv', () => {
  it('produces CSV the strict parser accepts, with billed as alt_cost', () => {
    const { rows } = parseCsv(normalizedToCsv([row('2026-01'), row('2026-02', 1100), row('2026-03', 900)]))
    expect(rows).toHaveLength(3)
    expect(rows[1].meters.pool).toBe(1100)
    expect(rows[1].altCost).toBe(528)
  })

  it('rejects malformed normalized rows', () => {
    expect(() => parseCsv(normalizedToCsv([row('January'), row('2026-02'), row('2026-03')]))).toThrow(ParseError)
    expect(() => parseCsv(normalizedToCsv([row('2026-01')]))).toThrow(ParseError)
  })
})
