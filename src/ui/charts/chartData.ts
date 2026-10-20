import { mad, median } from '../../engine/stats'
import type { Finding, FindingKind, Severity } from '../../engine/types'

/** Normal range shown as the shaded band: median +/- 1.5 robust standard deviations. */
export const BAND_K = 1.5

export function normalBand(xs: number[]): { median: number; lo: number; hi: number } {
  const m = median(xs)
  const spread = 1.4826 * mad(xs)
  return { median: m, lo: Math.max(0, m - BAND_K * spread), hi: m + BAND_K * spread }
}

/** Findings that describe the whole season rather than particular months. */
export const SEASON_WIDE: FindingKind[] = ['dominant-meter', 'budget-shape']

export const SEV_COLOR: Record<Severity, string> = {
  high: 'var(--color-high)',
  medium: 'var(--color-medium-mark)',
  info: 'var(--color-info)',
}

/** Worst open severity per month, for chart markers. */
export function worstByMonth(findings: Finding[]): Record<string, Severity> {
  const order: Record<Severity, number> = { high: 0, medium: 1, info: 2 }
  const out: Record<string, Severity> = {}
  for (const f of findings) {
    if (f.status === 'expected' || f.status === 'resolved' || SEASON_WIDE.includes(f.kind)) continue
    for (const m of f.months) if (!out[m] || order[f.severity] < order[out[m]]) out[m] = f.severity
  }
  return out
}
