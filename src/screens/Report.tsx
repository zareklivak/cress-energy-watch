import { Printer } from 'lucide-react'
import { monthLong, monthShort, mult, usd, usdK } from '../engine/format'
import { sum } from '../engine/stats'
import { useApp } from '../state/store'
import { Button } from '../ui/Button'
import { CostBars } from '../ui/charts/CostBars'
import { fmtDay } from '../ui/labels'
import { MonthSwitcher } from '../ui/shell/MonthSwitcher'
import { monthStory, whatChanged } from './overview/story'

export default function Report() {
  const { state, rows, findings, openFlags, label } = useApp()
  const i = Math.max(0, rows.findIndex((r) => r.month === state.month))
  const row = rows[i]
  const story = monthStory(rows, i, findings, label)
  const changes = whatChanged(rows, i, findings, label)
  const toDate = rows.slice(0, i + 1)
  const actualToDate = sum(toDate.map((r) => r.calcCost))
  const budgetToDate = sum(toDate.map((r) => r.budget))
  // Only issues the board could know about by this month: this month's first, then earlier ones.
  const known = openFlags.filter((f) => f.months.length >= rows.length || f.months.some((mo) => mo <= row.month))
  const here = known.filter((f) => f.months.includes(row.month) && f.months.length < rows.length)
  const issues = [...here, ...known.filter((f) => !here.includes(f))].slice(0, 3)
  const actionsFor = (id: string) => state.activity.filter((a) => a.findingId === id).map((a) => a.text)

  return (
    <>
      <div className="no-print mx-auto mb-4 flex max-w-[780px] flex-wrap items-center justify-between gap-3">
        <h1 className="text-stat font-semibold tracking-tight sm:text-figure">Board report</h1>
        <div className="flex flex-wrap gap-2">
          <MonthSwitcher />
          <Button variant="primary" onClick={() => window.print()}><Printer size={16} aria-hidden />Export PDF</Button>
        </div>
      </div>

      <article className="print-page mx-auto max-w-[780px] rounded-card border border-line bg-card px-4 py-6 shadow-sheet sm:px-12 sm:py-12">
        <p className="text-micro font-semibold uppercase tracking-[0.14em] text-mute">Silver Pine Lodge · Gas</p>
        <h2 className="mt-2 font-serif text-display font-medium leading-tight sm:text-report">Monthly gas report, {monthLong(row.month)}</h2>
        <p className="mt-1 text-meta text-mute">Prepared {fmtDay(new Date().toISOString())} with Cress Energy Watch</p>

        <dl className="mt-8 grid grid-cols-1 items-start gap-4 sm:grid-cols-3 border-y border-line py-5 sm:gap-4">
          <div><dt className="text-meta text-ink/70">Cost this month</dt><dd className="num mt-1 font-serif text-heading sm:text-figure">{usd(row.calcCost)}</dd><dd className="text-meta text-ink/70">Budget {usd(row.budget)}</dd></div>
          <div><dt className="text-meta text-ink/70">Against budget</dt><dd className={`num mt-1 font-serif text-heading sm:text-figure ${row.calcCost > row.budget ? 'text-high' : 'text-accent'}`}>{row.calcCost >= row.budget ? '+' : '−'}{usd(Math.abs(row.calcCost - row.budget))}</dd><dd className="text-meta text-ink/70">{row.calcCost >= row.budget ? 'Over' : 'Under'} budget{row.budget > 0 ? ` · ${mult(row.calcCost / row.budget)}` : ''}</dd></div>
          <div><dt className="text-meta text-ink/70">Season to date</dt><dd className="num mt-1 font-serif text-heading sm:text-figure">{usdK(actualToDate)}</dd><dd className="text-meta text-ink/70">{usdK(Math.abs(budgetToDate - actualToDate))} {actualToDate <= budgetToDate ? 'under' : 'over'} budget</dd></div>
        </dl>

        <section className="mt-8">
          <h3 className="font-serif text-stat font-medium">What explains the variance</h3>
          <p className="mt-2 text-lead leading-relaxed">{story.title}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-lead leading-relaxed text-ink/85">{changes.map((c) => <li key={c}>{c}</li>)}</ul>
          <div className="mt-5"><CostBars rows={toDate} findings={[]} selected={row.month} units="usd" height={200} label={label} /></div>
        </section>

        <section className="mt-8">
          <h3 className="font-serif text-stat font-medium">Top issues and actions</h3>
          {issues.length === 0 && <p className="mt-2 text-lead text-mute">No open issues.</p>}
          <ol className="mt-3 space-y-5">
            {issues.map((f, k) => (
              <li key={f.id}>
                <p className="font-serif text-title font-medium leading-snug"><span className="text-mute">{k + 1}.</span> {f.headline}</p>
                <p className="num mt-0.5 text-body text-ink/80">
                  {f.impactUsd !== null && <><strong className="font-semibold text-ink">{usd(f.impactUsd)}</strong> {f.impactLabel} · </>}
                  {f.months.length > 3 ? 'Whole season' : f.months.map(monthShort).join(', ')}
                </p>
                <p className="mt-1.5 text-body leading-relaxed"><strong>Next step:</strong> {f.nextStep}</p>
                {actionsFor(f.id).length
                  ? <p className="mt-1 text-body leading-relaxed"><strong>Actions taken:</strong> {actionsFor(f.id).join('; ')}</p>
                  : <p className="mt-1 text-meta text-ink/70">Action: none yet</p>}
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-10 border-t border-line pt-4 text-meta leading-relaxed text-ink/70">
          {state.dataset.source === 'sample' && "Sample data. "}Figures come from the property's gas tracking sheet, {monthLong(rows[0].month)} to {monthLong(rows[rows.length - 1].month)}. Weather: Open-Meteo historical data for Truckee.
        </footer>
      </article>
    </>
  )
}
