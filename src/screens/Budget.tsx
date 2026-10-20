import clsx from 'clsx'
import { Printer } from 'lucide-react'
import { useState } from 'react'
import { monthLong, monthShort, usd, usdK } from '../engine/format'
import { sum } from '../engine/stats'
import { useApp } from '../state/store'
import { Button } from '../ui/Button'
import { Card, Takeaway } from '../ui/Card'
import { BudgetChart } from '../ui/charts/BudgetChart'
import { Segmented } from '../ui/Segmented'
import { StatTile } from '../ui/StatTile'
import { useMediaQuery } from '../ui/useMediaQuery'
import { PageHeader } from '../ui/shell/PageHeader'

export default function Budget() {
  const { budget } = useApp()
  const [view, setView] = useState<'chart' | 'table'>('chart')
  const rows = budget.rows
  const t = { actual: sum(rows.map((r) => r.actual)), current: sum(rows.map((r) => r.current)), proposed: sum(rows.map((r) => r.proposed)) }
  const span = `${monthShort(rows[0].month)}–${monthShort(rows[rows.length - 1].month)}`
  const diff = t.proposed - t.current
  const wide = useMediaQuery('(min-width: 640px)')
  return (
    <>
      <PageHeader
        eyebrow="Next season"
        title="Budget planner"
        actions={<>
          <Segmented label="View" value={view} onChange={setView} options={[{ value: 'chart', label: 'Chart' }, { value: 'table', label: 'Table' }]} />
          <Button variant="primary" onClick={() => window.print()}><Printer size={16} aria-hidden />Export for board packet</Button>
        </>}
      />
      <div className="print-page">
      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-4">
        <StatTile label="Spent" value={usdK(t.actual)} sub="This season" />
        <StatTile label="Budget" value={usdK(t.current)} sub="Current" />
        <StatTile label="Proposed" value={usdK(t.proposed)} tone="good" sub={`${diff <= 0 ? '−' : '+'}${usdK(Math.abs(diff))} vs current`} />
      </div>
      <Card>
        <Takeaway>
          The proposed budget is {usdK(t.proposed)}, {usdK(Math.abs(diff))} {diff <= 0 ? 'less' : 'more'} than today&rsquo;s budget for <span className="whitespace-nowrap">{span}</span>.
        </Takeaway>
        <p className="mt-1 max-w-3xl text-body leading-relaxed text-ink/85">Based on this season&rsquo;s use, with billing errors and one-off spikes taken out, adjusted to a normal winter.</p>
        <div className={clsx('mt-4', view === 'table' && 'hidden print:block')}><BudgetChart rows={rows} showProposed height={wide ? 360 : 280} actualLabel="Spent" /></div>
        <div className={clsx('mt-4 overflow-x-auto', view === 'chart' && 'hidden print:block')}>
          <table className="w-full min-w-[34rem] text-body">
            <thead>
              <tr className="text-right text-micro uppercase tracking-wider text-mute">
                <th className="pb-2 text-left font-semibold">Month</th>
                <th className="pb-2 font-semibold">Actual</th>
                <th className="pb-2 font-semibold">Current budget</th>
                <th className="pb-2 font-semibold text-accent">Proposed</th>
                <th className="pb-2 font-semibold">Change</th>
              </tr>
            </thead>
            <tbody className="num">
              {rows.map((r) => (
                <tr key={r.month} className="border-t border-line text-right">
                  <td className="py-2 text-left">{monthLong(r.month)}</td>
                  <td className="py-2">{usd(r.actual)}</td>
                  <td className="py-2">{usd(r.current)}</td>
                  <td className="py-2 font-semibold text-accent">{usd(r.proposed)}</td>
                  <td className={clsx('py-2', r.proposed < r.current ? 'text-accent' : 'text-high')}>{r.proposed >= r.current ? '+' : '−'}{usd(Math.abs(r.proposed - r.current))}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-ink/20 text-right font-semibold">
                <td className="py-2 text-left">Total</td>
                <td className="py-2">{usd(t.actual)}</td>
                <td className="py-2">{usd(t.current)}</td>
                <td className="py-2 text-accent">{usd(t.proposed)}</td>
                <td className="py-2">{t.proposed >= t.current ? '+' : '−'}{usd(Math.abs(t.proposed - t.current))}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <details className="mt-4 max-w-3xl text-body leading-relaxed">
          <summary className="cursor-pointer font-medium text-accent">How we built this</summary>
          <p className="mt-2 text-ink/80">{budget.method}</p>
        </details>
      </Card>
      </div>
    </>
  )
}
