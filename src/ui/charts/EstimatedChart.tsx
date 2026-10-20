import { Bar, CartesianGrid, ComposedChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { joinList, monthShort, num, numK } from '../../engine/format'
import { sum } from '../../engine/stats'
import type { MeterId, MonthRow } from '../../engine/types'
import { AXIS_TICK, TOOLTIP_STYLE } from './axis'

/** The meters that read near zero, stacked on the rest, around the estimated month: the dip and the catch-up. */
export function EstimatedChart({ rows, months, meters, flagged, label }: { rows: MonthRow[]; months: string[]; meters: MeterId[]; flagged: string; label: (m: MeterId) => string }) {
  const names = joinList(meters.map(label))
  const data = rows
    .filter((r) => months.includes(r.month))
    .map((r) => {
      const these = sum(meters.map((m) => r.meters[m]))
      return { label: monthShort(r.month), these, others: r.totalCuft - these }
    })
  return (
    <div>
      <div className="h-60 w-full" role="img" aria-label={`Gas use for ${months.map(monthShort).join(', ')}: the ${meters.length} meters drop in ${monthShort(flagged)} and catch up after`}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 22, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} />
            <YAxis width={46} tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={numK} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name) => [`${num(Number(v))} cu ft`, name === 'these' ? names : 'Other meters']} />
            <ReferenceArea x1={monthShort(flagged)} x2={monthShort(flagged)} fill="var(--color-medium-soft)" fillOpacity={1} label={{ value: 'Estimated?', position: 'insideTop', fill: 'var(--color-medium)', fontSize: 12 }} />
            <Bar dataKey="others" name="others" stackId="a" fill="var(--color-bar)" isAnimationActive={false} />
            <Bar dataKey="these" name="these" stackId="a" fill="var(--color-accent)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 text-caption text-mute">
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-sm bg-accent" />{names}</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-sm bg-bar" />Other meters</li>
      </ul>
    </div>
  )
}
