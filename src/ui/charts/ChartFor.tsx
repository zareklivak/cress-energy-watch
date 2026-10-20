import type { Finding, MeterId } from '../../engine/types'
import { useApp } from '../../state/store'
import { MicroLabel } from '../Card'
import { MismatchCard } from '../MismatchCard'
import { BandChart } from './BandChart'
import { BudgetChart } from './BudgetChart'
import { EstimatedChart } from './EstimatedChart'
import { RepeatTable } from './RepeatTable'
import { ShareBars } from './ShareBars'

/** The chart that fits a finding's kind (spec §5, Anomaly detail). */
export function ChartFor({ finding }: { finding: Finding }) {
  const { rows, label, budget, findings } = useApp()
  // Months on the same meter flagged by other open findings, so every out-of-band point is explained.
  const also = (m: MeterId) =>
    findings
      .filter((x) => x.id !== finding.id && x.meters.includes(m) && (x.status === 'new' || x.status === 'reviewing') && x.months.length < rows.length)
      .flatMap((x) => x.months)
  const c = finding.chart
  switch (c.type) {
    case 'band':
      return (
        <div className="space-y-6">
          {c.series.map((s) => (
            <div key={s.meter}>
              <MicroLabel>{label(s.meter)} · cu ft per month</MicroLabel>
              <BandChart rows={rows} meter={s.meter} highlight={s.highlight} also={finding.kind === 'seasonal-shutdown' ? [] : also(s.meter)} tone={finding.kind === 'seasonal-shutdown' ? 'expected' : 'flag'} />
            </div>
          ))}
        </div>
      )
    case 'share':
      return (<><MicroLabel className="mb-3">Share of all gas, {rows.length} months</MicroLabel><ShareBars rows={rows} highlight={c.meter} label={label} /></>)
    case 'estimated':
      return (<><MicroLabel>All meters · cu ft</MicroLabel><EstimatedChart rows={rows} months={c.months} meters={c.meters} flagged={finding.months[0]} label={label} /></>)
    case 'repeat':
      return (<><MicroLabel className="mb-3">Meter by meter</MicroLabel><RepeatTable rows={rows} months={c.months} meters={c.meters} label={label} /></>)
    case 'mismatch':
      return (
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            {c.months.map((m) => {
              const r = rows.find((x) => x.month === m)!
              return <MismatchCard key={m} month={m} calculated={r.calcCost} billed={r.altCost} className="border-0 bg-sunk/60 p-3 sm:p-3" />
            })}
          </div>
          <p className="mt-3 text-meta text-ink/80">{c.meter ? `${label(c.meter)}'s entry explains the gap.` : 'No single meter explains the gap in either month.'}</p>
        </div>
      )
    case 'budget':
      return (<><MicroLabel>Actual vs budget by month</MicroLabel><BudgetChart rows={budget.rows} showProposed={false} /></>)
  }
}
