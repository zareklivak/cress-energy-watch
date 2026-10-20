import { useState } from 'react'
import { usd } from '../engine/format'
import type { FindingKind, MeterId, Severity } from '../engine/types'
import { useApp } from '../state/store'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { FilterChip } from '../ui/FilterChip'
import { ACTIONS, groupFlags } from '../ui/actions'
import { FlagCard } from '../ui/FlagCard'
import { KIND_LABEL } from '../ui/labels'
import { PageHeader } from '../ui/shell/PageHeader'

const SEVERITIES: Severity[] = ['high', 'medium', 'info']
const SEV_LABEL: Record<Severity, string> = { high: 'High', medium: 'Medium', info: 'Info' }

export default function Inbox() {
  const { flags, expected, openFlags, label } = useApp()
  const [severity, setSeverity] = useState<Severity | 'all'>('all')
  const [kind, setKind] = useState<FindingKind | 'all'>('all')
  const [meter, setMeter] = useState<MeterId | 'all'>('all')

  const listed = flags.filter((f) => f.status !== 'expected')
  const kinds = [...new Set(listed.map((f) => f.kind))]
  const meters = [...new Set(listed.flatMap((f) => f.meters))].sort((a, b) => label(a).localeCompare(label(b), 'en', { numeric: true }))
  const shown = listed
    .filter((f) => (severity === 'all' || f.severity === severity) && (kind === 'all' || f.kind === kind) && (meter === 'all' || f.meters.includes(meter)))
    .sort((a, b) => Number(a.status === 'resolved') - Number(b.status === 'resolved'))
  const reset = () => { setSeverity('all'); setKind('all'); setMeter('all') }
  const groups = groupFlags(shown)
  const select = 'min-h-10 rounded-full border border-line bg-card px-3 text-body font-medium text-ink hover:border-ink/40'

  const row = 'no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0'
  return (
    <>
      <PageHeader eyebrow="Gas · whole season" title="Anomalies" />
      <p className="-mt-3 mb-3 text-body text-mute">{openFlags.length} open · {flags.length - openFlags.length - expected.filter((f) => f.kind !== 'seasonal-shutdown').length} resolved · {expected.length} expected</p>

      <div className="space-y-1">
        <div className={row} role="group" aria-label="Filter by severity">
          <FilterChip active={severity === 'all'} onClick={() => setSeverity('all')} quiet>All severities</FilterChip>
          {SEVERITIES.map((s) => <FilterChip key={s} active={severity === s} onClick={() => setSeverity(s)}>{SEV_LABEL[s]}</FilterChip>)}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <label className="flex items-center gap-2 text-body text-ink/80">Type
            <select aria-label="Type" value={kind} onChange={(e) => setKind(e.target.value as FindingKind | 'all')} className={select}>
              <option value="all">All types</option>
              {kinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-body text-ink/80">Meter
            <select aria-label="Meter" value={meter} onChange={(e) => setMeter(e.target.value as MeterId | 'all')} className={select}>
              <option value="all">All meters</option>
              {meters.map((m) => <option key={m} value={m}>{label(m)}</option>)}
            </select>
          </label>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">Showing {shown.length} of {listed.length} flags</p>

      {ACTIONS.map(({ group, title, sub }) => {
        const g = groups[group]
        if (!g.flags.length) return null
        return (
          <section key={group} id={group} aria-labelledby={`h-${group}`} className="mt-6 scroll-mt-6">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
              <h2 id={`h-${group}`} className="text-title font-semibold">{title} <span className="num font-normal text-ink/70">({g.flags.length})</span></h2>
              {g.atStake > 0 && <p className="num text-body text-ink/75"><span className="font-semibold text-ink">{usd(g.atStake)}</span> at stake</p>}
            </div>
            <p className="-mt-1 mb-3 text-meta text-ink/70">{sub}</p>
            <div className="grid items-stretch gap-3 md:grid-cols-2">
              {g.flags.map((f) => <FlagCard key={f.id} finding={f} />)}
            </div>
          </section>
        )
      })}
      {shown.length === 0 && (
        <Card className="mt-5 text-center">
          <p className="text-body text-mute">No flags match these filters.</p>
          <Button className="mt-3" onClick={reset}>Clear filters</Button>
        </Card>
      )}

      {expected.length > 0 && (
        <details className="mt-8 rounded-card border border-line bg-card">
          <summary className="cursor-pointer px-4 py-3 text-lead font-semibold">Expected ({expected.length}) <span className="font-normal text-mute">· not flagged</span></summary>
          <div className="grid gap-3 border-t border-line p-4 md:grid-cols-2">{expected.map((f) => <FlagCard key={f.id} finding={f} />)}</div>
        </details>
      )}
    </>
  )
}
