import { METERS } from './types.js'

/** One month as the AI reader returns it. `billed` is the bill's own total (the sheet's alt_cost). */
export type NormalizedRow = {
  month: string
  m3: number; m7: number; m1: number; m2: number; pool: number; m4: number; m5: number; m6: number
  total_cuft: number; rate: number; calc_cost: number; billed: number; budget: number
}
export type NormalizedResult = { rows: NormalizedRow[]; notes: string[] }

const NUM = { type: 'number' } as const
const ROW_KEYS = ['month', ...METERS, 'total_cuft', 'rate', 'calc_cost', 'billed', 'budget'] as const

/** JSON Schema for Claude's structured output. */
export const NORMALIZED_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rows', 'notes'],
  properties: {
    rows: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [...ROW_KEYS],
        properties: Object.fromEntries(ROW_KEYS.map((k) => [k, k === 'month' ? { type: 'string', description: 'YYYY-MM' } : NUM])),
      },
    },
    notes: { type: 'array', items: { type: 'string' } },
  },
} as const

/** Back to the sheet format the strict parser reads. */
export function normalizedToCsv(rows: NormalizedRow[]): string {
  const header = ['month', ...METERS, 'total_cuft', 'rate', 'calc_cost', 'alt_cost', 'budget']
  const lines = rows.map((r) => [r.month, ...METERS.map((m) => r[m]), r.total_cuft, r.rate, r.calc_cost, r.billed, r.budget].join(','))
  return [header.join(','), ...lines].join('\n')
}
