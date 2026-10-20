import clsx from 'clsx'
import type { KeyboardEvent } from 'react'

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  // Radio-group keyboard pattern: one tab stop, arrow keys move the selection.
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const at = options.findIndex((o) => o.value === value)
    const next = options[(at + step + options.length) % options.length]
    onChange(next.value)
    ;(e.currentTarget.querySelectorAll('[role=radio]')[options.indexOf(next)] as HTMLElement | undefined)?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKey} className="inline-flex rounded-full bg-sunk p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          tabIndex={value === o.value ? 0 : -1}
          onClick={() => onChange(o.value)}
          className={clsx(
            'min-h-11 min-w-12 rounded-full sm:min-h-9 px-3.5 text-meta font-semibold transition-colors',
            value === o.value ? 'bg-card text-ink shadow-thumb' : 'text-mute hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
