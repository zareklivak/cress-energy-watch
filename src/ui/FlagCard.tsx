import { Link } from 'react-router-dom'
import { monthShort, usd } from '../engine/format'
import type { Finding } from '../engine/types'
import { useApp } from '../state/store'
import { normalBand } from './charts/chartData'
import { CONFIDENCE } from './labels'
import { SeverityPill, StatusPill } from './Pill'
import { RangeStrip } from './RangeStrip'

export function FlagCard({ finding, compact = false }: { finding: Finding; compact?: boolean }) {
  const { label, rows } = useApp()
  const single = finding.chart.type === 'band' && finding.chart.series.length === 1 ? finding.chart.series[0] : null
  const strip = (() => {
    if (!single || compact) return null
    const month = single.highlight[single.highlight.length - 1]
    const xs = rows.map((r) => r.meters[single.meter])
    const at = rows.findIndex((r) => r.month === month)
    if (at < 0) return null
    // Dollars first: the meter's cu ft priced at that month's rate.
    const rate = rows[at].rate
    const band = normalBand(xs)
    return <RangeStrip value={xs[at] * rate} lo={band.lo * rate} hi={band.hi * rate} typical={band.median * rate} max={Math.max(...xs) * rate * 1.05} valueLabel={monthShort(month)} />
  })()
  const when = finding.months.length > 3 ? 'Whole season' : finding.months.map(monthShort).join(', ')
  const sorted = [...finding.meters].sort((a, b) => label(a).localeCompare(label(b), 'en', { numeric: true }))
  const meters = sorted.length === 0 ? 'All meters' : sorted.length > 2 ? `${sorted.length} meters` : sorted.map(label).join(', ')

  return (
    <Link
      to={`/anomalies/${finding.id}`}
      className="group block h-full min-w-0 rounded-card border border-line bg-card p-4 transition-colors hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-accent"
    >
      <div className="flex items-center gap-2">
        <SeverityPill severity={finding.severity} />
        {meters && <span className="min-w-0 truncate text-meta text-mute">{meters}</span>}
        {/* "New" is the default for every flag; only show a status once someone has acted on it. */}
        {finding.status !== 'new' && <span className="ml-auto shrink-0"><StatusPill status={finding.status} /></span>}
      </div>
      <p className="mt-2 text-lead font-semibold leading-snug text-ink decoration-ink/30 underline-offset-2 group-hover:underline">{finding.headline}</p>
      {finding.impactUsd !== null && finding.severity !== 'info' && (
        <p className="mt-1.5 text-meta text-mute">
          <span className="num text-title font-semibold text-ink">{usd(finding.impactUsd)}</span> {finding.impactLabel}
        </p>
      )}
      {finding.impactUsd !== null && finding.severity === 'info' && (
        <p className="num mt-1.5 text-meta text-mute">{usd(finding.impactUsd)} {finding.impactLabel}</p>
      )}
      {!compact && <p className="mt-0.5 text-meta text-mute">{CONFIDENCE[finding.confidence]} · {when}</p>}
      {strip}
    </Link>
  )
}
