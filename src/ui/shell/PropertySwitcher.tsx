import { Building2, Check, ChevronsUpDown } from 'lucide-react'

const SAMPLES = ['Lakeside HOA', 'Ridgeview Condos']

/** The demo property plus two greyed sample properties that hint at portfolio scale. */
export function PropertySwitcher() {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-left hover:border-ink/30 [&::-webkit-details-marker]:hidden">
        <Building2 size={16} className="shrink-0 text-accent" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold leading-tight">Silver Pine Lodge</span>
          <span className="block text-caption text-mute">Truckee, CA · Gas</span>
        </span>
        <ChevronsUpDown size={15} className="shrink-0 text-mute" aria-hidden />
      </summary>
      <ul aria-label="Properties" className="absolute left-0 right-0 z-30 mt-1 min-w-[15rem] rounded-xl border border-line bg-card p-1 shadow-lg">
        <li aria-current="true" className="flex items-center gap-2 rounded-lg px-3 py-2 text-body font-semibold">
          <Check size={15} className="text-accent" aria-hidden /> Silver Pine Lodge
        </li>
        {SAMPLES.map((name) => (
          <li key={name} aria-disabled="true" className="flex cursor-not-allowed items-center justify-between gap-2 rounded-lg px-3 py-2 pl-8 text-body text-mute">
            {name} <span className="rounded-full bg-sunk px-2 py-0.5 text-micro font-semibold">Coming soon</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
