import clsx from 'clsx'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

/** `quiet` is for the default "All …" chip: selected but not drawn as an active filter. */
export function FilterChip({ active, onClick, children, quiet = false }: { active: boolean; onClick: () => void; children: ReactNode; quiet?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        'inline-flex min-h-11 shrink-0 sm:min-h-9 items-center gap-1 whitespace-nowrap rounded-full border px-3 text-meta font-medium transition-colors',
        active && quiet ? 'border-ink/25 bg-card font-semibold text-ink' : active ? 'border-accent/40 bg-accent-soft text-accent' : 'border-line bg-card text-ink hover:border-ink/40',
      )}
    >
      {active && !quiet && <Check size={14} aria-hidden />}
      {children}
    </button>
  )
}
