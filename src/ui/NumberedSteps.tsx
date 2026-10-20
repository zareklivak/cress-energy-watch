import clsx from 'clsx'
import type { ReactNode } from 'react'

/** Four-step case file. Desktop: separate cards. Phone: one card, hairline-divided rows. */
export function NumberedSteps({ steps }: { steps: { title: string; body: ReactNode; emphasis?: boolean }[] }) {
  return (
    <ol className="overflow-hidden rounded-card border border-line bg-card max-sm:divide-y max-sm:divide-line sm:grid sm:grid-cols-2 sm:items-stretch sm:gap-3 sm:overflow-visible sm:border-0 sm:bg-transparent lg:grid-cols-3">
      {steps.map((s, i) => (
        <li
          key={s.title}
          className={clsx(
            'p-4 sm:rounded-card sm:border',
            s.emphasis ? 'bg-accent-soft sm:border-accent/30' : 'sm:border-line sm:bg-card',
          )}
        >
          <div className="flex items-center gap-2">
            <span className={clsx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption font-bold', s.emphasis ? 'bg-accent text-white' : 'bg-sunk text-ink')}>{i + 1}</span>
            <h3 className="text-body font-semibold">{s.title}</h3>
          </div>
          <div className="mt-2 text-body leading-relaxed text-ink/85">{s.body}</div>
        </li>
      ))}
    </ol>
  )
}
