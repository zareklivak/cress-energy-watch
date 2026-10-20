import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { monthShort, num, numK } from '../../engine/format'
import type { MeterId, MonthRow } from '../../engine/types'
import { AXIS_TICK, niceTicks, TOOLTIP_STYLE } from './axis'
import { normalBand } from './chartData'

/** One meter's monthly use with the shaded normal range; highlighted months get a tinted column and a large dot. */
export function BandChart({ rows, meter, highlight, also = [], tone = 'flag', height = 240, hitLabel = 'This flag' }: { rows: MonthRow[]; meter: MeterId; highlight: string[]; also?: string[]; tone?: 'flag' | 'expected'; height?: number; hitLabel?: string }) {
  // Spikes: the engine's own median/MAD over all months. Shutdowns: the usual range of the
  // months outside the shutdown, so the zeros don't stretch "normal" down to 0.
  const rest = rows.filter((r) => !highlight.includes(r.month)).map((r) => r.meters[meter])
  const band = tone === 'expected' && rest.length >= 3
    ? { lo: Math.min(...rest), hi: Math.max(...rest), median: normalBand(rest).median }
    : normalBand(rows.map((r) => r.meters[meter]))
  const data = rows.map((r) => ({ label: monthShort(r.month), value: r.meters[meter], band: [band.lo, band.hi] as [number, number], hit: highlight.includes(r.month), other: also.includes(r.month) }))
  const hitColor = tone === 'expected' ? 'var(--color-mute)' : 'var(--color-high)'
  const ticks = niceTicks(Math.max(band.hi, ...data.map((d) => d.value)))
  const hits = data.filter((d) => d.hit).map((d) => d.label)
  const renderDot = (props: unknown) => {
    const p = props as { cx?: number; cy?: number; index?: number }
    const key = `dot-${p.index}`
    if (p.cx == null || p.cy == null) return <g key={key} />
    const d = data[p.index ?? 0]
    if (d?.hit) return <circle key={key} cx={p.cx} cy={p.cy} r={5.5} fill={hitColor} stroke="#fff" strokeWidth={2} />
    if (d?.other) return <circle key={key} cx={p.cx} cy={p.cy} r={4.5} fill="var(--color-medium-mark)" stroke="#fff" strokeWidth={1.5} />
    return <circle key={key} cx={p.cx} cy={p.cy} r={2.5} fill="var(--color-accent)" />
  }
  return (
    <div>
      <div style={{ height }} className="w-full" role="img" aria-label={`Monthly use; normal range ${num(band.lo)} to ${num(band.hi)} cu ft; typical ${num(band.median)}`}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} />
            <YAxis width={46} tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={numK} ticks={ticks} domain={[0, ticks[ticks.length - 1]]} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v) => (Array.isArray(v) ? [`${num(Number(v[0]))} to ${num(Number(v[1]))} cu ft`, 'Normal range'] : [`${num(Number(v))} cu ft`, 'Used'])}
            />
            {hits.length > 0 && (
              <ReferenceArea x1={hits[0]} x2={hits[hits.length - 1]} fill={tone === 'expected' ? 'var(--color-sunk)' : 'var(--color-high-soft)'} fillOpacity={0.8} />
            )}
            <Area dataKey="band" stroke="none" fill="var(--color-accent-soft)" isAnimationActive={false} />
            <ReferenceLine y={band.median} stroke="var(--color-accent)" strokeOpacity={0.5} strokeDasharray="4 4" />
            <Line dataKey="value" stroke="var(--color-accent)" strokeWidth={2} dot={renderDot} activeDot={{ r: 5 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-mute">
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-sm bg-accent-soft ring-1 ring-accent/20" />{tone === 'expected' ? 'Usual range outside the shutdown' : 'Normal range'}</li>
        <li className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-accent/60" />Typical month ({numK(band.median)} cu ft)</li>
        {hits.length > 0 && (
          tone === 'expected'
            ? <li className="flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-sm bg-sunk ring-1 ring-ink/15" />Seasonal shutdown: {hits[0]}–{hits[hits.length - 1]}</li>
            : <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: hitColor }} />{hitLabel}: {hits.join(', ')}</li>
        )}
        {data.some((d) => d.other) && (
          <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-medium-mark" />Other flags: {data.filter((d) => d.other).map((d) => d.label).join(', ')}</li>
        )}
      </ul>
    </div>
  )
}
