import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

export function Button({ variant = 'secondary', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return (
    <button
      type="button"
      {...props}
      className={clsx(
        'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-body font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] sm:min-h-10',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-accent text-white hover:bg-accent-strong',
        variant === 'secondary' && 'border border-line bg-card text-ink hover:border-ink/40 hover:bg-sunk/60',
        variant === 'ghost' && 'text-accent hover:bg-accent-soft',
        className,
      )}
    />
  )
}
