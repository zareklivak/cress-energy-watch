import { median, robustZ, sum } from './stats'
import { METERS, type HddByMonth, type MeterId, type MonthRow } from './types'

/** Every threshold the engine uses. Spec section 4. */
export const T = {
  DIP_RATIO: 0.25,
  Z_SPIKE: 3.5,
  MOM_SPIKE: 2.5,
  ESTIMATED_MIN_METERS: 3,
  HEATING_HDD: 300,
  CATCH_UP_RATIO: 1.5,
  REPEAT_MIN_METERS: 3,
  COST_GAP_USD: 100,
  COST_GAP_PCT: 0.005,
  COST_MATCH_USD: 1,
  OVER_BUDGET: 0.5,
  DOMINANT_SHARE: 0.3,
  SHUTDOWN_RATIO: 0.05,
  BUDGET_OFF: 0.15,
  BUDGET_OFF_MONTHS: 4,
  BUDGET_FLIP_RISE: 1.1,
} as const

export type Ref = { meter: MeterId; i: number }
export type Shutdown = { meter: MeterId; start: number; end: number }
export type Spike = { meter: MeterId; start: number; end: number; peak: number }
export type EstimatedMonth = {
  i: number
  meters: MeterId[]
  catchUps: Ref[]
  identical: { value: number; meters: MeterId[] }[]
}
export type Repeat = { i: number; meters: MeterId[] }
export type CostGap = { i: number; gap: number; explainedBy: { meter: MeterId; correctCuft: number } | null }
export type OverBudget = { i: number; ratio: number; topMeter: MeterId }
export type Dominant = { meter: MeterId; share: number; cuft: number; usd: number }
export type BudgetShape = { offMonths: number[]; equalPairs: number[]; flips: number[]; signals: number }

export function series(rows: MonthRow[], m: MeterId): number[] {
  return rows.map((r) => r.meters[m])
}

/** Month number 1..12 of row i. */
function calMonth(rows: MonthRow[], i: number): number {
  return Number(rows[i].month.slice(5, 7))
}

/**
 * A meter that falls to <= 5% of its median after April and stays there to
 * the last month (at least 2 months) is a planned seasonal shutdown.
 */
export function findShutdowns(rows: MonthRow[]): Shutdown[] {
  const out: Shutdown[] = []
  const last = rows.length - 1
  for (const m of METERS) {
    const xs = series(rows, m)
    const limit = T.SHUTDOWN_RATIO * median(xs)
    let start = last + 1
    while (start - 1 >= 0 && xs[start - 1] <= limit) start--
    // The run must begin after April and cover at least 2 months.
    while (start <= last && (calMonth(rows, start) < 5 || calMonth(rows, start) > 10)) start++
    if (start <= last - 1) out.push({ meter: m, start, end: last })
  }
  return out
}

function inShutdown(shutdowns: Shutdown[], meter: MeterId, i: number): boolean {
  return shutdowns.some((s) => s.meter === meter && i >= s.start && i <= s.end)
}

/** A reading under 25% of every neighboring month that exists. */
export function findDips(rows: MonthRow[], shutdowns: Shutdown[]): Ref[] {
  const out: Ref[] = []
  for (const m of METERS) {
    const xs = series(rows, m)
    xs.forEach((x, i) => {
      if (inShutdown(shutdowns, m, i)) return
      const neighbors = [xs[i - 1], xs[i + 1]].filter((n): n is number => n !== undefined)
      if (neighbors.length && neighbors.every((n) => x < T.DIP_RATIO * n)) out.push({ meter: m, i })
    })
  }
  return out
}

function isDip(dips: Ref[], meter: MeterId, i: number): boolean {
  return dips.some((d) => d.meter === meter && d.i === i)
}

/**
 * Spike start: robust z > 3.5, at least 2.5x the prior month, and the prior
 * month was not a dip (otherwise it is a catch-up read). Following months
 * with z > 3.5 extend the same spike.
 */
export function findSpikes(rows: MonthRow[], dips: Ref[]): Spike[] {
  const out: Spike[] = []
  for (const m of METERS) {
    const xs = series(rows, m)
    const z = robustZ(xs)
    for (let i = 1; i < xs.length; i++) {
      const starts = z[i] > T.Z_SPIKE && xs[i] >= T.MOM_SPIKE * xs[i - 1] && !isDip(dips, m, i - 1)
      if (!starts) continue
      let end = i
      while (end + 1 < xs.length && z[end + 1] > T.Z_SPIKE) end++
      let peak = i
      for (let j = i; j <= end; j++) if (xs[j] > xs[peak]) peak = j
      out.push({ meter: m, start: i, end, peak })
      i = end
    }
  }
  return out
}

/** 3+ meters dipping in the same heating-season month = estimated reads. */
export function findEstimatedMonths(rows: MonthRow[], dips: Ref[], hdd: HddByMonth): EstimatedMonth[] {
  const out: EstimatedMonth[] = []
  rows.forEach((row, i) => {
    const meters = METERS.filter((m) => isDip(dips, m, i))
    if (meters.length < T.ESTIMATED_MIN_METERS || (hdd[row.month] ?? 0) <= T.HEATING_HDD) return
    const catchUps: Ref[] = []
    if (i + 1 < rows.length && i - 1 >= 0) {
      for (const m of meters) {
        if (rows[i + 1].meters[m] >= T.CATCH_UP_RATIO * rows[i - 1].meters[m]) catchUps.push({ meter: m, i: i + 1 })
      }
    }
    const byValue = new Map<number, MeterId[]>()
    for (const m of meters) byValue.set(row.meters[m], [...(byValue.get(row.meters[m]) ?? []), m])
    const identical = [...byValue.entries()]
      .filter(([, ms]) => ms.length > 1)
      .map(([value, ms]) => ({ value, meters: ms }))
    out.push({ i, meters, catchUps, identical })
  })
  return out
}

/** Dips that are not part of an estimated-read month. */
export function findDropOuts(dips: Ref[], estimated: EstimatedMonth[]): Ref[] {
  return dips.filter((d) => !estimated.some((e) => e.i === d.i))
}

/** 3+ meters with exactly last month's (non-zero) value. */
export function findRepeats(rows: MonthRow[]): Repeat[] {
  const out: Repeat[] = []
  for (let i = 1; i < rows.length; i++) {
    const meters = METERS.filter((m) => rows[i].meters[m] > 0 && rows[i].meters[m] === rows[i - 1].meters[m])
    if (meters.length >= T.REPEAT_MIN_METERS) out.push({ i, meters })
  }
  return out
}

/**
 * Calculated vs billed cost. If the gap equals one meter's change to a value
 * that meter shows in another month (within $1), it is an entry error on
 * that meter; otherwise it is unexplained.
 */
export function findCostGaps(rows: MonthRow[]): CostGap[] {
  const out: CostGap[] = []
  rows.forEach((row, i) => {
    const gap = row.calcCost - row.altCost
    if (Math.abs(gap) <= T.COST_GAP_USD || Math.abs(gap) <= T.COST_GAP_PCT * row.calcCost) return
    const matches = new Map<MeterId, number>()
    for (const m of METERS) {
      rows.forEach((other, j) => {
        const candidate = other.meters[m]
        if (j === i || candidate <= 0) return
        if (Math.abs((row.meters[m] - candidate) * row.rate - gap) <= T.COST_MATCH_USD) matches.set(m, candidate)
      })
    }
    const explainedBy = matches.size === 1
      ? { meter: [...matches.keys()][0], correctCuft: [...matches.values()][0] }
      : null
    out.push({ i, gap, explainedBy })
  })
  return out
}

/** Calculated cost more than 50% over budget. */
export function findOverBudget(rows: MonthRow[]): OverBudget[] {
  const out: OverBudget[] = []
  rows.forEach((row, i) => {
    const ratio = row.calcCost / row.budget
    if (ratio - 1 <= T.OVER_BUDGET) return
    const topMeter = METERS.reduce((a, b) => (row.meters[b] > row.meters[a] ? b : a))
    out.push({ i, ratio, topMeter })
  })
  return out
}

/** One meter using more than 30% of all gas this season. */
export function findDominant(rows: MonthRow[]): Dominant[] {
  const total = sum(rows.map((r) => r.totalCuft))
  return METERS.flatMap((m) => {
    const cuft = sum(series(rows, m))
    const share = cuft / total
    if (share <= T.DOMINANT_SHARE) return []
    return [{ meter: m, share, cuft, usd: sum(rows.map((r) => r.meters[m] * r.rate)) }]
  })
}

/** Does the budget's month-by-month shape match how the property uses gas? */
export function checkBudgetShape(rows: MonthRow[]): BudgetShape {
  const offMonths = rows.flatMap((r, i) => (Math.abs(r.calcCost / r.budget - 1) > T.BUDGET_OFF ? [i] : []))
  const equalPairs: number[] = []
  const flips: number[] = []
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].budget === rows[i - 1].budget) equalPairs.push(i)
    if (rows[i].budget < rows[i - 1].budget && rows[i].calcCost > T.BUDGET_FLIP_RISE * rows[i - 1].calcCost) flips.push(i)
  }
  const signals = Number(offMonths.length >= T.BUDGET_OFF_MONTHS) + Number(equalPairs.length > 0) + Number(flips.length > 0)
  return { offMonths, equalPairs, flips, signals }
}
