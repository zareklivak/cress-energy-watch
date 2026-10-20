import clsx from 'clsx'
import { Check } from 'lucide-react'

export type StepState = 'todo' | 'active' | 'done'

export function StepStrip({ steps }: { steps: { label: string; state: StepState }[] }) {
  return (
    <ol className="flex items-start" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s.label} className="flex flex-1 flex-col items-center gap-2 text-center">
          <div className="flex w-full items-center">
            <span className={clsx('h-0.5 flex-1', i === 0 ? 'opacity-0' : s.state === 'todo' ? 'bg-line' : 'bg-accent')} />
            <span
              aria-current={s.state === 'active' ? 'step' : undefined}
              className={clsx(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 text-caption font-bold transition',
                s.state === 'done' && 'border-accent bg-accent text-white',
                s.state === 'active' && 'border-accent bg-accent text-white ring-4 ring-accent/15',
                s.state === 'todo' && 'border-line bg-card text-mute',
              )}
            >
              {s.state === 'done' ? <Check size={15} aria-hidden /> : i + 1}
            </span>
            <span className={clsx('h-0.5 flex-1', i === steps.length - 1 ? 'opacity-0' : steps[i + 1].state === 'todo' ? 'bg-line' : 'bg-accent')} />
          </div>
          <span className={clsx('px-1 text-meta leading-tight', s.state === 'todo' ? 'text-mute' : 'font-semibold text-ink')}>{s.label}</span>
        </li>
      ))}
    </ol>
  )
}
