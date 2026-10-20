import { ChevronLeft, ChevronRight } from 'lucide-react'
import { monthLong } from '../../engine/format'
import { useApp } from '../../state/store'

export function MonthSwitcher() {
  const { state, dispatch, rows } = useApp()
  const i = rows.findIndex((r) => r.month === state.month)
  const go = (k: number) => dispatch({ type: 'setMonth', month: rows[k].month })
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-line bg-card p-0.5">
      <button type="button" aria-label="Previous month" disabled={i <= 0} onClick={() => go(i - 1)} className="rounded-full p-1.5 text-mute hover:bg-sunk disabled:opacity-30">
        <ChevronLeft size={16} />
      </button>
      <label htmlFor="month-select" className="sr-only">Month</label>
      <select
        id="month-select"
        value={state.month}
        onChange={(e) => dispatch({ type: 'setMonth', month: e.target.value })}
        className="num cursor-pointer appearance-none bg-transparent px-1 text-center text-body font-semibold text-ink"
      >
        {rows.map((r) => <option key={r.month} value={r.month}>{monthLong(r.month)}</option>)}
      </select>
      <button type="button" aria-label="Next month" disabled={i >= rows.length - 1} onClick={() => go(i + 1)} className="rounded-full p-1.5 text-mute hover:bg-sunk disabled:opacity-30">
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
