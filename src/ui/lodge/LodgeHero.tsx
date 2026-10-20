import { Maximize2 } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { monthLong } from '../../engine/format'
import { useApp } from '../../state/store'
import { ErrorBoundary } from '../ErrorBoundary'
import { Sheet } from '../Sheet'
import { MonthSwitcher } from '../shell/MonthSwitcher'
import { useMediaQuery } from '../useMediaQuery'
import { LodgeMap } from './LodgeMap'
import { makePins, TONE_COLOR } from './pins'

const Lodge3D = lazy(() => import('./Lodge3D'))

const LEGEND = [['high', 'High flag'], ['medium', 'Medium flag'], ['expected', 'Expected'], ['ok', 'Normal']] as const

function MapView({ pins, expanded, onOpen, wide }: { pins: ReturnType<typeof makePins>; expanded: boolean; onOpen: (href: string) => void; wide: boolean }) {
  const flat = <LodgeMap pins={pins} expanded={expanded} onOpen={onOpen} />
  if (!wide) return flat
  return (
    <ErrorBoundary fallback={flat}>
      <Suspense fallback={flat}><Lodge3D pins={pins} expanded={expanded} onOpen={onOpen} /></Suspense>
    </ErrorBoundary>
  )
}

export function LodgeHero({ height = 260 }: { height?: number | string }) {
  const { state, rows, findings, label } = useApp()
  const navigate = useNavigate()
  const [big, setBig] = useState(false)
  const pins = useMemo(() => makePins({ findings, label, month: state.month, rows }), [findings, label, state.month, rows])
  const wide = useMediaQuery('(min-width: 640px)')
  const open = (href: string) => { setBig(false); navigate(href) }
  return (
    <>
      <figure className="relative m-0 overflow-hidden rounded-card border border-line bg-map" style={{ height }}>
        <MapView pins={pins} expanded={false} onOpen={open} wide={wide} />
        <button type="button" onClick={() => setBig(true)} className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-2.5 py-1 text-caption font-semibold text-ink shadow-sm hover:bg-card focus-visible:outline-2 focus-visible:outline-accent">
          <Maximize2 size={13} aria-hidden />Expand map
        </button>
        <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2 text-micro text-mute">
          <span className="whitespace-nowrap rounded-full bg-card/90 px-2 py-0.5 text-micro text-ink/75 sm:text-caption"><span className="sm:hidden">Pins illustrative</span><span className="max-sm:hidden">Illustrative pin locations</span></span>
          <span className="whitespace-nowrap rounded-full bg-card/90 px-2 py-0.5 text-micro text-ink/75 sm:text-caption">Illustrative site plan</span>
        </figcaption>
      </figure>
      <ul aria-label="Pin colors" className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-caption text-ink/75">
        {LEGEND.map(([tone, text]) => <li key={tone} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: TONE_COLOR[tone] }} />{text}</li>)}
      </ul>
      <Sheet open={big} onClose={() => setBig(false)} title={`Site map · ${monthLong(state.month)}`} size="wide">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <MonthSwitcher />
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-meta text-ink/80">
            {LEGEND.map(([tone, text]) => <li key={tone} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: TONE_COLOR[tone] }} />{text}</li>)}
          </ul>
        </div>
        <div className="h-[68vh] overflow-hidden rounded-xl border border-line bg-map">
          {big && <MapView pins={pins} expanded onOpen={open} wide={wide} />}
        </div>
        <p className="mt-2 text-meta text-ink/70">Click a pin to open this month&rsquo;s flag, or the meter&rsquo;s page when it&rsquo;s normal. {wide ? 'Drag to turn, scroll to zoom. ' : ''}Pin locations are illustrative.</p>
      </Sheet>
    </>
  )
}
