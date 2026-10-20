import type { Finding, FindingKind } from '../engine/types'

/** What the manager does next, rather than what kind of anomaly it is. */
export type ActionGroup = 'inspect' | 'utility' | 'budget'

export const ACTION_OF: Record<Exclude<FindingKind, 'seasonal-shutdown'>, ActionGroup> = {
  'over-budget': 'inspect',
  'dominant-meter': 'inspect',
  'estimated-reads': 'utility',
  'repeat-month': 'utility',
  'entry-error': 'utility',
  'cost-mismatch': 'utility',
  'drop-out': 'utility',
  'budget-shape': 'budget',
}

/** Kinds whose impact is money at stake (not a season total or an underspend). */
const AT_STAKE = new Set<FindingKind>(['over-budget', 'estimated-reads', 'repeat-month', 'entry-error', 'cost-mismatch', 'drop-out'])

export const ACTIONS: { group: ActionGroup; title: string; sub: string }[] = [
  { group: 'inspect', title: 'Inspect equipment', sub: 'Gas use the bills can’t explain' },
  { group: 'utility', title: 'Check bills with the utility', sub: 'Estimated, copied or mistyped readings' },
  { group: 'budget', title: 'Reset next season’s budget', sub: 'Monthly budgets that don’t match how the lodge uses gas' },
]

export type GroupSummary = { flags: Finding[]; atStake: number }

/** Open flags sorted into the three action groups, with the dollars each group puts at stake. */
export function groupFlags(open: Finding[]): Record<ActionGroup, GroupSummary> {
  const out: Record<ActionGroup, GroupSummary> = { inspect: { flags: [], atStake: 0 }, utility: { flags: [], atStake: 0 }, budget: { flags: [], atStake: 0 } }
  for (const f of open) {
    if (f.kind === 'seasonal-shutdown') continue
    const g = out[ACTION_OF[f.kind]]
    g.flags.push(f)
    if (AT_STAKE.has(f.kind)) g.atStake += f.impactUsd ?? 0
  }
  return out
}
