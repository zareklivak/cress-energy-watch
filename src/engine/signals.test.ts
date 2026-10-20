import { describe, expect, it } from 'vitest'
import { makeRows } from './fixtures'
import {
  checkBudgetShape, findCostGaps, findDips, findDominant, findDropOuts, findEstimatedMonths,
  findOverBudget, findRepeats, findShutdowns, findSpikes,
} from './signals'

const WINTER = { '2026-01': 1000, '2026-02': 900, '2026-03': 800, '2026-04': 700, '2026-05': 500, '2026-06': 150 }

describe('findDips', () => {
  it('fires when a reading is under 25% of every neighbor', () => {
    const rows = makeRows({ meters: { m1: [100, 20, 100] } })
    expect(findDips(rows, [])).toEqual([{ meter: 'm1', i: 1 }])
  })
  it('fires on the first month using only the next month', () => {
    const rows = makeRows({ meters: { m1: [20, 100, 100] } })
    expect(findDips(rows, [])).toEqual([{ meter: 'm1', i: 0 }])
  })
  it('does not fire at 30% of a neighbor', () => {
    const rows = makeRows({ meters: { m1: [100, 30, 100] } })
    expect(findDips(rows, [])).toEqual([])
  })
  it('does not fire when one neighbor is also low (a decline, not a dip)', () => {
    const rows = makeRows({ meters: { m1: [100, 20, 0, 0] } })
    expect(findDips(rows, [])).toEqual([])
  })
})

describe('findShutdowns', () => {
  it('fires when a meter drops near zero after April and stays there', () => {
    const rows = makeRows({ meters: { m7: [900, 950, 880, 900, 870, 20, 0, 0] } }) // Jan..Aug
    expect(findShutdowns(rows)).toEqual([{ meter: 'm7', start: 5, end: 7 }])
  })
  it('does not fire when the meter rebounds', () => {
    const rows = makeRows({ meters: { m7: [900, 950, 880, 900, 870, 20, 0, 900] } })
    expect(findShutdowns(rows)).toEqual([])
  })
  it('does not fire for a single low last month', () => {
    const rows = makeRows({ meters: { m7: [900, 950, 880, 900, 870, 900, 880, 0] } })
    expect(findShutdowns(rows)).toEqual([])
  })
  it('excludes shutdown months from dips', () => {
    const rows = makeRows({ meters: { m7: [900, 950, 880, 900, 870, 20, 0, 0] } })
    expect(findDips(rows, findShutdowns(rows))).toEqual([])
  })
})

describe('findSpikes', () => {
  const base = [90, 110, 100, 95, 105, 100, 400, 100, 98]
  it('fires on a robust-z outlier that is 2.5x the prior month', () => {
    const rows = makeRows({ meters: { pool: base } })
    expect(findSpikes(rows, [])).toEqual([{ meter: 'pool', start: 6, end: 6, peak: 6 }])
  })
  it('extends a spike through following outlier months and peaks at the max', () => {
    const rows = makeRows({ meters: { pool: [90, 110, 100, 95, 105, 100, 400, 500, 98] } })
    expect(findSpikes(rows, [])).toEqual([{ meter: 'pool', start: 6, end: 7, peak: 7 }])
  })
  it('does not fire on a catch-up read right after a dip', () => {
    const rows = makeRows({ meters: { pool: [90, 110, 100, 95, 105, 10, 400, 100, 98] } })
    const dips = findDips(rows, [])
    expect(dips).toEqual([{ meter: 'pool', i: 5 }])
    expect(findSpikes(rows, dips)).toEqual([])
  })
  it('does not fire on the first month (no prior month to compare)', () => {
    const rows = makeRows({ meters: { pool: [400, 90, 110, 100, 95, 105, 100, 100, 98] } })
    expect(findSpikes(rows, [])).toEqual([])
  })
})

describe('findEstimatedMonths / findDropOuts', () => {
  const three = { m1: [100, 10, 300], m2: [100, 10, 300], m4: [100, 10, 100] }
  it('groups 3+ same-month dips in heating season into one estimated month, with catch-ups', () => {
    const rows = makeRows({ meters: three })
    const dips = findDips(rows, [])
    const est = findEstimatedMonths(rows, dips, WINTER)
    expect(est).toHaveLength(1)
    expect(est[0].i).toBe(1)
    expect(est[0].meters).toEqual(['m1', 'm2', 'm4'])
    expect(est[0].catchUps).toEqual([{ meter: 'm1', i: 2 }, { meter: 'm2', i: 2 }])
    expect(est[0].identical).toEqual([{ value: 10, meters: ['m1', 'm2', 'm4'] }])
    expect(findDropOuts(dips, est)).toEqual([])
  })
  it('does not group when the month is not in heating season', () => {
    const rows = makeRows({ meters: three, start: '2026-05' })
    const dips = findDips(rows, [])
    expect(findEstimatedMonths(rows, dips, WINTER)).toEqual([])
    expect(findDropOuts(dips, [])).toHaveLength(3)
  })
  it('treats 2 same-month dips as drop-outs', () => {
    const rows = makeRows({ meters: { m1: [100, 10, 100], m2: [100, 10, 100] } })
    const dips = findDips(rows, [])
    const est = findEstimatedMonths(rows, dips, WINTER)
    expect(est).toEqual([])
    expect(findDropOuts(dips, est)).toEqual([{ meter: 'm1', i: 1 }, { meter: 'm2', i: 1 }])
  })
})

describe('findRepeats', () => {
  it('fires when 3+ meters exactly repeat last month', () => {
    const rows = makeRows({ meters: { m1: [5, 7, 7], m2: [6, 8, 8], m3: [9, 4, 4], m4: [1, 2, 3] } })
    expect(findRepeats(rows)).toEqual([
      { i: 1, meters: ['m7', 'pool', 'm5', 'm6'] }, // untouched meters sit at a flat 1,000
      { i: 2, meters: ['m3', 'm7', 'm1', 'm2', 'pool', 'm5', 'm6'] },
    ])
  })
  it('ignores repeated zeros and fires nothing when fewer than 3 meters repeat', () => {
    const vary = (k: number) => [k, k + 1, k + 2]
    const rows = makeRows({
      meters: { m3: vary(10), m7: [0, 0, 0], m1: [0, 0, 0], m2: [5, 5, 6], pool: vary(40), m4: vary(50), m5: vary(60), m6: vary(70) },
    })
    expect(findRepeats(rows)).toEqual([])
  })
})

describe('findCostGaps', () => {
  it('ignores gaps of $100 or less', () => {
    expect(findCostGaps(makeRows({ length: 3, billedDelta: [0, 90, 0] }))).toEqual([])
  })
  it('explains a gap that equals one meter changed to a value it shows in another month', () => {
    // m1 reads 3,000 in month 2 but was billed as 1,000 (its value elsewhere): gap = 2,000 x $0.06 = $120
    const rows = makeRows({ meters: { m1: [1000, 1000, 3000], m2: [1500, 1600, 1700] }, billedDelta: [0, 0, 120] })
    expect(findCostGaps(rows)).toEqual([{ i: 2, gap: 120, explainedBy: { meter: 'm1', correctCuft: 1000 } }])
  })
  it('leaves an unexplained gap unexplained', () => {
    const rows = makeRows({ length: 3, billedDelta: [0, 0, 263] })
    expect(findCostGaps(rows)).toEqual([{ i: 2, gap: 263, explainedBy: null }])
  })
})

describe('findOverBudget / findDominant / checkBudgetShape', () => {
  it('fires over budget above +50% and names the biggest meter', () => {
    const rows = makeRows({ meters: { pool: [1000, 9000] }, budget: [480, 600] })
    expect(findOverBudget(rows)).toEqual([{ i: 1, ratio: 960 / 600, topMeter: 'pool' }])
  })
  it('does not fire at +40%', () => {
    expect(findOverBudget(makeRows({ length: 2, budget: [480, 343] }))).toEqual([])
  })
  it('fires dominant above a 30% share only', () => {
    expect(findDominant(makeRows({ length: 2, meters: { pool: [5000, 5000] } })).map((d) => d.meter)).toEqual(['pool'])
    expect(findDominant(makeRows({ length: 2 }))).toEqual([])
  })
  it('counts budget-shape signals', () => {
    const fair = makeRows({ length: 6, budget: [480, 490, 500, 510, 520, 530] })
    expect(checkBudgetShape(fair).signals).toBe(0)
    const off = makeRows({ length: 6, budget: [900, 900, 300, 300, 900, 900] })
    // every month off by >15%, two equal pairs... (900,900),(300,300),(900,900); no flips (cost flat)
    expect(checkBudgetShape(off)).toMatchObject({ signals: 2, equalPairs: [1, 3, 5], flips: [] })
  })
})
