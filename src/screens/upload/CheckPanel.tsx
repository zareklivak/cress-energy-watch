import { monthShort, num, usd } from '../../engine/format'
import type { Dataset } from '../../state/store'
import { Button } from '../../ui/Button'

/** Shows what the AI reader found, before anything is analyzed. */
export function CheckPanel({ dataset, notes, onUse, onRetry }: { dataset: Dataset; notes: string[]; onUse: () => void; onRetry: () => void }) {
  const { rows } = dataset
  const span = `${monthShort(rows[0].month)} ${rows[0].month.slice(0, 4)} to ${monthShort(rows[rows.length - 1].month)} ${rows[rows.length - 1].month.slice(0, 4)}`
  return (
    <div className="text-left">
      <h2 className="text-title font-semibold">Here&rsquo;s what we read</h2>
      <p className="mt-1 text-body text-ink/80">{rows.length} months, 8 meters · {span}. Read with AI from {dataset.fileName}.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="num w-full min-w-[22rem] text-body">
          <thead><tr className="text-right text-micro uppercase tracking-wider text-mute"><th className="pb-2 text-left font-semibold">Month</th><th className="pb-2 font-semibold">Gas (cu ft)</th><th className="pb-2 font-semibold">Cost</th><th className="pb-2 font-semibold">Budget</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.month} className="border-t border-line text-right"><td className="py-1.5 text-left">{monthShort(r.month)} {r.month.slice(0, 4)}</td><td className="py-1.5">{num(r.totalCuft)}</td><td className="py-1.5">{usd(r.calcCost)}</td><td className="py-1.5">{usd(r.budget)}</td></tr>
          ))}</tbody>
        </table>
      </div>
      {notes.length > 0 && <ul className="mt-4 list-disc space-y-1 pl-5 text-body text-ink/80">{notes.map((n) => <li key={n}>{n}</li>)}</ul>}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button variant="primary" onClick={onUse}>Use this data</Button>
        <Button onClick={onRetry}>Try another file</Button>
      </div>
    </div>
  )
}
