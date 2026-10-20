import clsx from 'clsx'
import { monthLong, usd } from '../engine/format'

/** Calculated vs billed cost: the direction and size of the gap is the headline. */
export function MismatchCard({ month, calculated, billed, note, className }: { month: string; calculated: number; billed: number; note?: string; className?: string }) {
  const gap = Math.abs(calculated - billed)
  return (
    <div className={clsx('rounded-card border border-line bg-card p-4', className)}>
      <p className="text-meta text-mute">{monthLong(month)}</p>
      <p className="mt-0.5 flex items-start gap-2 text-title font-semibold leading-snug">
        <span className="mt-[7px] h-2.5 w-2.5 shrink-0 rounded-full bg-medium-mark" aria-hidden />
        <span>The bill is <span className="num">{usd(gap)}</span> {billed < calculated ? 'lower' : 'higher'} than expected</span>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-card px-3 py-3 text-center ring-1 ring-line">
          <p className="text-meta text-mute">Expected</p>
          <p className="num mt-0.5 text-heading font-semibold">{usd(calculated)}</p>
          <p className="text-caption text-mute">usage × rate</p>
        </div>
        <div className="rounded-xl bg-card px-3 py-3 text-center ring-1 ring-line">
          <p className="text-meta text-mute">Billed</p>
          <p className="num mt-0.5 text-heading font-semibold">{usd(billed)}</p>
        </div>
      </div>
      {note && <p className="mt-3 text-meta text-ink/80">{note}</p>}
    </div>
  )
}
