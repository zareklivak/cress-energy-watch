import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, actions }: { eyebrow?: string; title: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="text-micro font-semibold uppercase tracking-[0.08em] text-mute">{eyebrow}</p>}
        <h1 className="mt-1 text-stat font-semibold tracking-tight text-ink sm:text-figure">{title}</h1>
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
