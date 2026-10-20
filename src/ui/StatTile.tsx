import clsx from 'clsx'
import type { ReactNode } from 'react'
import { MicroLabel } from './Card'

export function StatTile({ label, value, sub, tone = 'neutral', emphasis = false }: { label: string; value: string; sub?: ReactNode; tone?: 'neutral' | 'bad' | 'good' | 'muted'; emphasis?: boolean }) {
  return (
    <div className={clsx('rounded-card border px-4 py-3', emphasis && tone === 'bad' ? 'border-high/30 bg-high-soft/60' : 'border-line bg-card')}>
      <MicroLabel>{label}</MicroLabel>
      <p className={clsx('num mt-1 whitespace-nowrap text-stat font-semibold tracking-tight sm:text-stat', tone === 'bad' && 'text-high', tone === 'good' && 'text-accent', tone === 'muted' && 'text-mute')}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-meta leading-snug text-mute">{sub}</p>}
    </div>
  )
}
