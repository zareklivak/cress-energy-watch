import clsx from 'clsx'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Severity, Status } from '../engine/types'

const SEVERITY: Record<Severity, { label: string; cls: string }> = {
  high: { label: 'High', cls: 'bg-high-soft text-high' },
  medium: { label: 'Medium', cls: 'bg-medium-soft text-medium' },
  info: { label: 'Info', cls: 'bg-info-soft text-info' },
}

const STATUS: Record<Status, { label: string; cls: string }> = {
  new: { label: 'New', cls: 'border border-line bg-card text-ink' },
  reviewing: { label: 'Reviewing', cls: 'border border-accent/50 bg-card text-accent' },
  resolved: { label: 'Resolved', cls: 'bg-accent-soft text-accent' },
  expected: { label: 'Expected', cls: 'bg-sunk text-mute' },
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-caption font-semibold', className)}>
      {children}
    </span>
  )
}

export function SeverityPill({ severity }: { severity: Severity }) {
  const s = SEVERITY[severity]
  return <Pill className={s.cls}>{s.label}</Pill>
}

export function StatusPill({ status }: { status: Status }) {
  const s = STATUS[status]
  return (
    <Pill className={s.cls}>
      {status === 'new' && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
      {(status === 'expected' || status === 'resolved') && <Check size={12} aria-hidden />}
      {s.label}
    </Pill>
  )
}

export function MeterChip({ children }: { children: ReactNode }) {
  return <Pill className="max-w-[12rem] truncate bg-sunk font-medium text-ink/80">{children}</Pill>
}
