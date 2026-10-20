import { Plug } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MicroLabel } from '../ui/Card'
import { AXIS_TICK, TOOLTIP_STYLE } from '../ui/charts/axis'
import { Pill } from '../ui/Pill'
import { PreviewBanner } from '../ui/PreviewBanner'
import { PageHeader } from '../ui/shell/PageHeader'
import { NIGHT, PREVIEWS } from './preview/mock'

export default function Preview() {
  return (
    <>
      <PageHeader eyebrow="Level 2 · needs a connection" title="With integration" />
      <PreviewBanner />
      <p className="mt-4 max-w-2xl text-lead leading-relaxed text-ink/80">
        Bills tell you <em>that</em> gas use moved. A connection to the building's controls tells you <em>which equipment</em> moved it, the same night. Here's what those checks would look like.
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {PREVIEWS.map((p) => (
          <article key={p.id} className="flex flex-col rounded-card border-2 border-dashed border-ink/20 bg-card/70 p-4">
            <div className="flex items-center gap-2"><Pill className="border border-medium-mark/40 bg-note text-ink">Sample values</Pill><span className="text-meta text-ink/80">Not your data</span></div>
            <h2 className="mt-2 text-lead font-semibold leading-snug">{p.title}</h2>
            <p className="mt-1.5 text-body leading-relaxed text-ink/80">{p.body}</p>
            <MicroLabel className="mt-auto pt-3">{p.unit} · overnight</MicroLabel>
            <div className="relative mt-1 h-44" role="img" aria-label={`Sample chart: ${p.title}`}>
              <span className="pointer-events-none absolute right-1 top-0 z-10 text-caption font-semibold uppercase tracking-wider text-ink/60">Sample</span>
              <ResponsiveContainer>
                <LineChart data={p.series.map((v, k) => ({ t: NIGHT[k], v }))} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--color-line)" />
                  <XAxis dataKey="t" tickLine={false} axisLine={false} tick={AXIS_TICK} interval={1} />
                  <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} width={34} domain={p.reference.from === p.reference.to ? [50, 80] : [0, 'auto']} ticks={p.reference.from === p.reference.to ? [50, 60, 70, 80] : undefined} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [String(v), p.unit]} />
                  {p.reference.from === p.reference.to
                    ? <ReferenceLine y={p.reference.from} stroke="var(--color-mute)" strokeWidth={2} />
                    : <ReferenceArea y1={p.reference.from} y2={p.reference.to} fill="var(--color-accent-soft)" fillOpacity={1} />}
                  <Line dataKey="v" stroke="var(--color-info)" strokeWidth={2} strokeDasharray="6 3" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-meta text-ink/70">{p.reference.from === p.reference.to ? `Solid grey line: ${p.reference.label.toLowerCase()} (${p.reference.from})` : `Shaded: ${p.reference.label.toLowerCase()} (${p.reference.from}–${p.reference.to})`}</p>
            <p className="mt-2 flex items-center gap-1.5 text-meta text-ink/70"><Plug size={13} aria-hidden />Needs: {p.needs}</p>
          </article>
        ))}
      </div>
    </>
  )
}
