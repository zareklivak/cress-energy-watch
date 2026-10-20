import { pct } from '../../engine/format'
import { sum } from '../../engine/stats'
import { METERS, type MeterId, type MonthRow } from '../../engine/types'

export function ShareBars({ rows, highlight, label }: { rows: MonthRow[]; highlight: MeterId; label: (m: MeterId) => string }) {
  const total = sum(rows.map((r) => r.totalCuft))
  const items = METERS.map((m) => ({ m, cuft: sum(rows.map((r) => r.meters[m])) })).sort((a, b) => b.cuft - a.cuft)
  return (
    <ul className="space-y-2" aria-label="Share of all gas by meter">
      {items.map((it) => (
        <li key={it.m} className="grid grid-cols-[minmax(0,7rem)_1fr_3rem] items-center gap-3 text-body">
          <span className="truncate">{label(it.m)}</span>
          <span className="h-2.5 rounded-full bg-sunk">
            <span className="block h-full rounded-full" style={{ width: `${(it.cuft / items[0].cuft) * 100}%`, background: it.m === highlight ? 'var(--color-accent)' : 'var(--color-bar)' }} />
          </span>
          <span className="num text-right text-mute">{pct(it.cuft / total)}</span>
        </li>
      ))}
    </ul>
  )
}
