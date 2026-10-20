import { Leaf } from 'lucide-react'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold text-ink">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white"><Leaf size={16} aria-hidden /></span>
      {!compact && <span className="text-lead tracking-tight">Cress Energy Watch</span>}
    </span>
  )
}
