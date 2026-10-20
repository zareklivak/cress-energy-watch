import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usd } from '../../engine/format'
import type { Finding } from '../../engine/types'
import { ACTIONS, groupFlags, type ActionGroup } from '../../ui/actions'
import { SeverityPill } from '../../ui/Pill'

const LINK: Record<ActionGroup, { to: string; text: string }> = {
  inspect: { to: '/anomalies#inspect', text: 'See equipment flags' },
  utility: { to: '/anomalies#utility', text: 'See billing flags' },
  budget: { to: '/budget', text: 'Open the budget planner' },
}

/** "What to do": open flags grouped by the action they call for, with the dollars at stake. */
export function ActionBoard({ open }: { open: Finding[] }) {
  if (open.length === 0) {
    return (
      <section aria-labelledby="todo" className="mt-6">
        <h2 id="todo" className="mb-3 text-title font-semibold">What to do</h2>
        <p className="rounded-card border border-line bg-card p-4 text-body text-ink/75">No open flags. Nice.</p>
      </section>
    )
  }
  const groups = groupFlags(open)
  const total = groups.inspect.atStake + groups.utility.atStake
  return (
    <section aria-labelledby="todo" className="mt-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="todo" className="text-title font-semibold">What to do</h2>
        {total > 0 && <p className="text-body text-ink/75"><span className="num font-semibold text-ink">{usd(total)}</span> at stake across {open.length} open flags</p>}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {ACTIONS.map(({ group, title, sub }) => {
          const g = groups[group]
          const worst = g.flags[0]
          return (
            <article key={group} className="flex flex-col rounded-card border border-line bg-card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-lead font-semibold">{title}</h3>
                <span className="num shrink-0 text-meta text-ink/70">{g.flags.length} {g.flags.length === 1 ? 'flag' : 'flags'}</span>
              </div>
              <p className="text-meta text-ink/70">{sub}</p>
              <p className={`num mt-3 text-figure font-semibold leading-none ${group === 'inspect' && g.atStake > 0 ? 'text-high' : 'text-ink'}`}>
                {g.atStake > 0 ? usd(g.atStake) : g.flags.length ? '—' : 'All clear'}
              </p>
              <p className="mt-1 text-meta text-ink/70">{g.atStake > 0 ? 'at stake' : g.flags.length ? 'no direct cost' : 'nothing to do here'}</p>
              {worst && (
                <Link to={`/anomalies/${worst.id}`} className="mt-3 flex items-start gap-2 rounded-xl bg-sunk/60 p-2.5 text-body leading-snug hover:bg-sunk">
                  <SeverityPill severity={worst.severity} />
                  <span className="min-w-0">{worst.headline}</span>
                </Link>
              )}
              <Link to={LINK[group].to} className="mt-auto inline-flex items-center gap-1 pt-3 text-body font-semibold text-accent hover:underline">
                {LINK[group].text} <ArrowRight size={15} aria-hidden />
              </Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}
