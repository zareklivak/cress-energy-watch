import clsx from 'clsx'
import { usdK } from '../engine/format'

/**
 * Where one month's cost sits on the meter's scale: a labelled tick at the
 * typical month and a labelled dot for this month. Grey track, no extra fills.
 */
export function RangeStrip({ value, hi, lo, typical, max, valueLabel }: { value: number; lo: number; hi: number; typical: number; max: number; valueLabel: string }) {
  const at = (v: number) => Math.min(100, Math.max(0, (v / max) * 100))
  const outside = value > hi || value < lo
  return (
    <div className="mt-3" role="img" aria-label={`${valueLabel}: ${usdK(value)}; a typical month is ${usdK(typical)}`}>
      <div className="relative h-5 text-caption">
        <span className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap text-mute" style={{ left: `${Math.max(12, Math.min(70, at(typical)))}%` }}>
          {usdK(typical)} typical
        </span>
        <span className={clsx('num absolute bottom-0 -translate-x-1/2 whitespace-nowrap font-semibold', outside ? 'text-high' : 'text-accent')} style={{ left: `${Math.min(88, Math.max(at(value), 30))}%` }}>
          {valueLabel} {usdK(value)}
        </span>
      </div>
      <div className="relative mt-1 h-1.5 rounded-full bg-ink/12">
        <div className="absolute -top-1 h-3.5 w-0.5 -translate-x-1/2 rounded-full bg-ink/70" style={{ left: `${at(typical)}%` }} />
        <div
          className={clsx('absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow', outside ? 'bg-high' : 'bg-accent')}
          style={{ left: `${at(value)}%` }}
        />
      </div>
    </div>
  )
}
