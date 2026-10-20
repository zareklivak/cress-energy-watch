import type { Confidence, FindingKind } from '../engine/types'

export const KIND_LABEL: Record<FindingKind, string> = {
  'over-budget': 'Over budget',
  'dominant-meter': 'Largest user',
  'estimated-reads': 'Estimated reads',
  'drop-out': 'Drop-out',
  'repeat-month': 'Copied month',
  'entry-error': 'Entry error',
  'cost-mismatch': 'Bill vs. math',
  'budget-shape': 'Budget pattern',
  'seasonal-shutdown': 'Seasonal',
}

export const CONFIDENCE: Record<Confidence, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
}

export function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
