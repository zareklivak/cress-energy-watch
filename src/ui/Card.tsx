import clsx from 'clsx'
import type { ReactNode } from 'react'

export function Card({ children, className, as: As = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return (
    <As className={clsx('rounded-card border border-line bg-card p-4 shadow-card sm:p-5', className)}>
      {children}
    </As>
  )
}

export function MicroLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx('text-micro font-semibold uppercase tracking-[0.08em] text-mute', className)}>{children}</p>
}

export function Takeaway({ children }: { children: ReactNode }) {
  return <h3 className="text-lead font-semibold leading-snug text-ink">{children}</h3>
}
