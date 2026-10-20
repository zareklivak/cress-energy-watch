export const METERS = ['m3', 'm7', 'm1', 'm2', 'pool', 'm4', 'm5', 'm6'] as const
export type MeterId = (typeof METERS)[number]

export const DEFAULT_LABELS: Record<MeterId, string> = {
  m3: 'Meter 3', m7: 'Meter 7', m1: 'Meter 1', m2: 'Meter 2',
  pool: 'Pool', m4: 'Meter 4', m5: 'Meter 5', m6: 'Meter 6',
}

/** One row of the utility sheet: one month, every meter. */
export type MonthRow = {
  month: string // 'YYYY-MM'
  meters: Record<MeterId, number> // cu ft
  totalCuft: number
  rate: number // $ per cu ft
  calcCost: number // $ (cu ft x rate, as typed in the sheet)
  altCost: number // $ (second cost column, treated as billed)
  budget: number // $
}

/** month 'YYYY-MM' -> heating degree days (base 65F) */
export type HddByMonth = Record<string, number>
/** calendar month '01'..'12' -> 10-year average HDD */
export type NormalHdd = Record<string, number>

export type Severity = 'high' | 'medium' | 'info'
export type Status = 'new' | 'reviewing' | 'resolved' | 'expected'
export type Confidence = 'high' | 'medium' | 'low'
export type FindingKind =
  | 'over-budget'
  | 'dominant-meter'
  | 'estimated-reads'
  | 'drop-out'
  | 'repeat-month'
  | 'entry-error'
  | 'cost-mismatch'
  | 'budget-shape'
  | 'seasonal-shutdown'

export type ChartSpec =
  | { type: 'band'; series: { meter: MeterId; highlight: string[] }[] }
  | { type: 'share'; meter: MeterId }
  | { type: 'estimated'; months: string[]; meters: MeterId[] }
  | { type: 'repeat'; months: string[]; meters: MeterId[] }
  | { type: 'mismatch'; months: string[]; meter: MeterId | null }
  | { type: 'budget' }

export type Finding = {
  id: string
  kind: FindingKind
  severity: Severity
  status: Status
  meters: MeterId[]
  months: string[]
  headline: string
  impactUsd: number | null
  impactLabel: string
  confidence: Confidence
  evidence: string[]
  causes: { text: string; weight: number }[]
  nextStep: string
  chart: ChartSpec
  /** numbers the UI and tests rely on, keyed by name */
  facts: Record<string, number>
}
