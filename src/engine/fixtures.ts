import { METERS, type MeterId, type MonthRow } from './types'

function addMonths(month: string, k: number): string {
  const total = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + k
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/**
 * Build a small synthetic sheet for rule tests. Meters not given read a flat
 * 1,000 cu ft. Costs are exact (cu ft x rate); budget defaults to cost.
 */
export function makeRows(opts: {
  start?: string
  length?: number
  meters?: Partial<Record<MeterId, number[]>>
  rate?: number
  budget?: number[]
  billedDelta?: number[] // altCost = calcCost - delta
}): MonthRow[] {
  const given = Object.values(opts.meters ?? {}) as number[][]
  const n = opts.length ?? given[0]?.length ?? 6
  const rate = opts.rate ?? 0.06
  return Array.from({ length: n }, (_, i) => {
    const meters = {} as Record<MeterId, number>
    for (const m of METERS) meters[m] = opts.meters?.[m]?.[i] ?? 1000
    const totalCuft = METERS.reduce((s, m) => s + meters[m], 0)
    const calcCost = Math.round(totalCuft * rate)
    return {
      month: addMonths(opts.start ?? '2026-01', i),
      meters,
      totalCuft,
      rate,
      calcCost,
      altCost: calcCost - (opts.billedDelta?.[i] ?? 0),
      budget: opts.budget?.[i] ?? calcCost,
    }
  })
}
