import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { monthLong, monthName, monthShort, mult, usd, usdK } from '../engine/format'
import { sum } from '../engine/stats'
import { useApp } from '../state/store'
import { Card, MicroLabel, Takeaway } from '../ui/Card'
import { CostBars } from '../ui/charts/CostBars'
import { LodgeHero } from '../ui/lodge/LodgeHero'
import { Segmented } from '../ui/Segmented'
import { MonthSwitcher } from '../ui/shell/MonthSwitcher'
import { StatTile } from '../ui/StatTile'
import { ActionBoard } from './overview/ActionBoard'
import { HowTo } from './overview/HowTo'
import { chartTakeaway, monthStory, whatChanged } from './overview/story'

export default function Overview() {
  const { state, dispatch, rows, findings, openFlags, label } = useApp()
  const i = Math.max(0, rows.findIndex((r) => r.month === state.month))
  const row = rows[i]
  const prev = rows[i - 1]
  const story = monthStory(rows, i, findings, label)
  const changes = whatChanged(rows, i, findings, label)
  const vsBudget = row.calcCost / row.budget - 1
  const toDate = rows.slice(0, i + 1)
  const spentToDate = sum(toDate.map((r) => r.calcCost))
  const budgetToDate = sum(toDate.map((r) => r.budget))

  return (
    <>
      <HowTo />
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <MicroLabel>Gas · {monthLong(row.month)}</MicroLabel>
        <div className="flex flex-wrap items-center gap-2">
          <MonthSwitcher />
          <Segmented label="Units" value={state.units} onChange={(units) => dispatch({ type: 'setUnits', units })} options={[{ value: 'usd', label: '$' }, { value: 'cuft', label: 'cu ft' }]} />
        </div>
      </div>

      <section className="grid items-center gap-5 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <h1 className="text-figure font-semibold leading-tight tracking-tight text-balance sm:text-display">{story.title}</h1>
          <p className="mt-3 text-lead leading-relaxed text-ink/75">{story.sub}</p>
          {story.findingId && (
            <Link to={`/anomalies/${story.findingId}`} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-body font-semibold text-white hover:bg-accent-strong">
              {story.cta} <ArrowRight size={16} aria-hidden />
            </Link>
          )}
        </div>
        <div className="[--hero:200px] sm:[--hero:260px]"><LodgeHero height="var(--hero)" /></div>
      </section>

      <ActionBoard open={openFlags} />

      <section aria-label="Key numbers" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={`${monthShort(row.month)} cost`} value={usd(row.calcCost)} sub={prev ? `${row.calcCost >= prev.calcCost ? '+' : '−'}${usd(Math.abs(row.calcCost - prev.calcCost))} vs ${monthName(prev.month)}` : 'First month of data'} />
        <StatTile
          label="vs budget"
          value={`${usd(Math.abs(row.calcCost - row.budget))} ${row.calcCost >= row.budget ? 'over' : 'under'}`}
          sub={`${mult(row.calcCost / row.budget)} the ${usd(row.budget)} budget`}
          tone={vsBudget > 0.15 ? 'bad' : vsBudget < -0.15 ? 'good' : 'neutral'}
          emphasis
        />
        <StatTile
          label="Season to date"
          value={usdK(spentToDate)}
          sub={`${usdK(Math.abs(spentToDate - budgetToDate))} ${spentToDate > budgetToDate ? 'over' : 'under'} the ${usdK(budgetToDate)} budget since ${monthShort(rows[0].month)}`}
        />
        <StatTile label="Open flags" value={String(openFlags.length)} sub={openFlags.length ? `${openFlags.filter((f) => f.severity === 'high').length} high` : 'No open flags'} />
      </section>

      <section className="mt-6 grid items-stretch gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <Takeaway>{chartTakeaway(rows, i, label, state.units)}</Takeaway>
          <div className="mt-3"><CostBars rows={rows} findings={findings} selected={row.month} units={state.units} label={label} /></div>
        </Card>
        <Card className="h-full">
          <MicroLabel>What changed in {monthName(row.month)}</MicroLabel>
          <ul className="mt-3 space-y-3 text-body leading-relaxed">
            {changes.map((c) => (
              <li key={c} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />{c}</li>
            ))}
          </ul>
        </Card>
      </section>

    </>
  )
}
