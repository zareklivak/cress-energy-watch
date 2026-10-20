import {
  findCostGaps, findDips, findEstimatedMonths, findOverBudget, findShutdowns, findSpikes, series,
} from './signals'
import { median, sum } from './stats'
import { METERS, type HddByMonth, type MeterId, type MonthRow, type NormalHdd } from './types'

export type BudgetRow = { month: string; actual: number; current: number; proposed: number }
export type BudgetPlan = { rows: BudgetRow[]; avgRate: number; method: string }

const WEATHER_MIN = 0.8
const WEATHER_MAX = 1.2
const HEATING_MONTH_HDD = 100

/**
 * This season's usage with known problems taken out: estimated-read months
 * spread across the read gap by degree days, entry errors corrected, and
 * spike months that drove an over-budget flag set back to the meter's median.
 */
export function correctedUsage(rows: MonthRow[], hdd: HddByMonth): Record<MeterId, number[]> {
  const usage = {} as Record<MeterId, number[]>
  for (const m of METERS) usage[m] = series(rows, m)

  const dips = findDips(rows, findShutdowns(rows))
  for (const e of findEstimatedMonths(rows, dips, hdd)) {
    if (e.i + 1 >= rows.length) continue
    const h1 = hdd[rows[e.i].month] ?? 0
    const h2 = hdd[rows[e.i + 1].month] ?? 0
    if (h1 + h2 === 0) continue
    for (const m of e.meters) {
      const total = usage[m][e.i] + usage[m][e.i + 1]
      usage[m][e.i] = (total * h1) / (h1 + h2)
      usage[m][e.i + 1] = total - usage[m][e.i]
    }
  }

  for (const g of findCostGaps(rows)) {
    if (g.explainedBy) usage[g.explainedBy.meter][g.i] = g.explainedBy.correctCuft
  }

  const spikes = findSpikes(rows, dips)
  for (const ob of findOverBudget(rows)) {
    const spike = spikes.find((s) => s.meter === ob.topMeter && ob.i >= s.start - 1 && ob.i <= s.end)
    if (!spike) continue
    const med = median(series(rows, spike.meter))
    for (let i = spike.start; i <= spike.end; i++) usage[spike.meter][i] = med
  }
  return usage
}

/** Weather factor for a month: normal / actual degree days, capped at +/-20%; 1 outside heating season. */
export function weatherFactor(month: string, hdd: HddByMonth, normal: NormalHdd): number {
  const actual = hdd[month] ?? 0
  const typical = normal[month.slice(5, 7)] ?? 0
  if (actual < HEATING_MONTH_HDD || typical === 0) return 1
  return Math.min(WEATHER_MAX, Math.max(WEATHER_MIN, typical / actual))
}

/** Proposed budget per month, rounded to the nearest $100. */
export function proposeBudget(rows: MonthRow[], hdd: HddByMonth, normal: NormalHdd): BudgetPlan {
  const usage = correctedUsage(rows, hdd)
  const avgRate = sum(rows.map((r) => r.rate)) / rows.length
  const out: BudgetRow[] = rows.map((r, i) => {
    const cuft = sum(METERS.map((m) => usage[m][i]))
    const proposed = Math.round((cuft * weatherFactor(r.month, hdd, normal) * avgRate) / 100) * 100
    return { month: r.month, actual: r.calcCost, current: r.budget, proposed }
  })
  return {
    rows: out,
    avgRate,
    method:
      "Built from this season's metered use, with estimated reads spread across the read gap, entry errors corrected and the spike behind the over-budget month set back to that meter's usual level. Each heating month is adjusted to a 10-year-normal winter (capped at ±20%) and priced at the season's average rate.",
  }
}
