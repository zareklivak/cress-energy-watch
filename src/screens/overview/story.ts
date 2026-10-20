import { inSentence, joinList, monthName, mult, pct, usd } from '../../engine/format'
import { METERS, type Finding, type MeterId, type MonthRow } from '../../engine/types'
import type { Units } from '../../state/store'
import { normalBand, SEASON_WIDE } from '../../ui/charts/chartData'

type Label = (m: MeterId) => string

/** Open, month-specific flags for month i, already in severity/impact order. */
function monthFlags(rows: MonthRow[], i: number, findings: Finding[]): Finding[] {
  return findings.filter(
    (f) => f.kind !== 'seasonal-shutdown' && !SEASON_WIDE.includes(f.kind) && f.status !== 'resolved' && f.status !== 'expected' && f.months.includes(rows[i].month),
  )
}

/** The one-sentence headline for the Overview (direction B). */
export function monthStory(rows: MonthRow[], i: number, findings: Finding[], label: Label) {
  const row = rows[i]
  const M = monthName(row.month)
  const vsBudget = `${usd(row.calcCost)} spent vs ${usd(row.budget)} budgeted.`
  const f = monthFlags(rows, i, findings)[0]
  if (!f) return { title: `${M} looks normal.`, sub: `${vsBudget} No open flags this month.`, findingId: null, cta: null }
  const meter = f.meters[0] ? inSentence(label(f.meters[0])) : ''
  switch (f.kind) {
    case 'over-budget':
      return {
        title: `${M}'s gas bill was ${mult(f.facts.ratio)} budget, and the ${meter} explains most of it.`,
        sub: `${vsBudget} The ${meter} alone was ${usd(f.facts.meterUsd)}.`,
        findingId: f.id,
        cta: `See the ${meter} flag`,
      }
    case 'estimated-reads':
      return { title: `${M} looks cheap, but the reads were probably estimated.`, sub: `${vsBudget} Expect it to catch up next month.`, findingId: f.id, cta: 'See why' }
    case 'repeat-month':
      return { title: `${M}'s numbers look copied from ${monthName(rows[i - 1].month)}.`, sub: `${vsBudget} Re-enter it from the bill before trusting it.`, findingId: f.id, cta: 'See the flag' }
    default:
      return { title: `${f.headline}.`, sub: vsBudget, findingId: f.id, cta: 'See the flag' }
  }
}

/** Up to three plain-English bullets for "What changed this month". */
export function whatChanged(rows: MonthRow[], i: number, findings: Finding[], label: Label): string[] {
  const row = rows[i]
  const prev = rows[i - 1]
  const out: string[] = []
  if (prev) {
    const delta = row.calcCost - prev.calcCost
    const top = METERS.map((m) => ({ m, d: row.meters[m] * row.rate - prev.meters[m] * prev.rate })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0]
    out.push(`${delta >= 0 ? 'Up' : 'Down'} ${usd(Math.abs(delta))} from ${monthName(prev.month)}. ${label(top.m)} ${top.d >= 0 ? 'added' : 'saved'} ${usd(Math.abs(top.d))} of that.`)
    if (Math.abs(row.budget / prev.budget - 1) > 0.2) {
      const opposite = row.budget < prev.budget !== row.calcCost < prev.calcCost
      out.push(`The budget ${row.budget < prev.budget ? 'dropped' : 'rose'} from ${usd(prev.budget)} to ${usd(row.budget)}${opposite ? ', while actual cost moved the other way' : ''}.`)
    }
  }
  const expectedHere = findings.filter((f) => f.kind === 'seasonal-shutdown' && f.months.includes(row.month)).flatMap((f) => f.meters)
  const outside = METERS.filter((m) => {
    if (expectedHere.includes(m)) return false
    const b = normalBand(rows.map((r) => r.meters[m]))
    return row.meters[m] > b.hi || row.meters[m] < b.lo
  })
  out.push(
    outside.length === 0
      ? 'Every meter stayed inside its normal range.'
      : outside.length === 1
        ? `${label(outside[0])} was the only meter outside its normal range.`
        : `${outside.length} meters were outside their normal range: ${joinList(outside.map(label))}.`,
  )
  return out.slice(0, 3)
}

/** One-line takeaway above the cost chart. */
export function chartTakeaway(rows: MonthRow[], i: number, label: Label, units: Units): string {
  const row = rows[i]
  const top = METERS.reduce((a, b) => (row.meters[b] > row.meters[a] ? b : a))
  return `${label(top)} gas was ${pct(row.meters[top] / row.totalCuft)} of ${monthName(row.month)}'s ${units === 'usd' ? 'bill' : 'gas use'}`
}
