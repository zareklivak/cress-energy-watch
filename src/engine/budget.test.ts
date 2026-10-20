import { describe, expect, it } from 'vitest'
import { correctedUsage, proposeBudget, weatherFactor } from './budget'
import { NORMAL_HDD, SAMPLE_ROWS, SEASON_HDD } from './sample'
import { median } from './stats'

describe('correctedUsage (sample)', () => {
  const usage = correctedUsage(SAMPLE_ROWS, SEASON_HDD)

  it('spreads February estimated reads into March without changing the two-month total', () => {
    for (const m of ['m1', 'm2', 'pool', 'm4', 'm6'] as const) {
      expect(usage[m][2] + usage[m][3]).toBeCloseTo(SAMPLE_ROWS[2].meters[m] + SAMPLE_ROWS[3].meters[m], 6)
      expect(usage[m][2]).toBeGreaterThan(SAMPLE_ROWS[2].meters[m])
    }
    expect(usage.m3[2]).toBe(SAMPLE_ROWS[2].meters.m3) // m3 was not part of the estimated month
  })

  it('corrects meter 1 in July to its June value', () => {
    expect(usage.m1[7]).toBe(SAMPLE_ROWS[6].meters.m1)
  })

  it('sets the April-May pool spike back to the pool median', () => {
    const med = median(SAMPLE_ROWS.map((r) => r.meters.pool))
    expect(usage.pool[4]).toBe(med)
    expect(usage.pool[5]).toBe(med)
  })

  it('leaves meter 7 summer shutdown alone', () => {
    expect(usage.m7.slice(6)).toEqual(SAMPLE_ROWS.slice(6).map((r) => r.meters.m7))
  })
})

describe('weatherFactor', () => {
  it('scales heating months by normal / actual degree days, capped at +/-20%', () => {
    expect(weatherFactor('2026-01', SEASON_HDD, NORMAL_HDD)).toBeCloseTo(1062 / 1048, 6)
    expect(weatherFactor('2026-03', SEASON_HDD, NORMAL_HDD)).toBe(1.2)
  })
  it('leaves summer months alone', () => {
    expect(weatherFactor('2026-07', SEASON_HDD, NORMAL_HDD)).toBe(1)
  })
})

describe('proposeBudget (sample)', () => {
  const plan = proposeBudget(SAMPLE_ROWS, SEASON_HDD, NORMAL_HDD)

  it('returns one row per month with actual and current budget from the sheet', () => {
    expect(plan.rows).toHaveLength(9)
    expect(plan.rows[5]).toMatchObject({ month: '2026-05', actual: SAMPLE_ROWS[5].calcCost, current: SAMPLE_ROWS[5].budget })
  })

  it('rounds proposals to the nearest $100 and keeps them positive', () => {
    for (const r of plan.rows) {
      expect(r.proposed % 100).toBe(0)
      expect(r.proposed).toBeGreaterThan(0)
    }
  })

  it('proposes more than this February (estimated) and less than this May (pool spike)', () => {
    expect(plan.rows[2].proposed).toBeGreaterThan(plan.rows[2].actual)
    expect(plan.rows[5].proposed).toBeLessThan(plan.rows[5].actual)
  })
})
