import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BudgetRow } from '../../engine/budget'
import { monthShort, usd } from '../../engine/format'
import { AXIS_TICK, niceTicks, TOOLTIP_STYLE, usdAxis } from './axis'


export function BudgetChart({ rows, showProposed, height = 260, actualLabel = 'Actual' }: { rows: BudgetRow[]; showProposed: boolean; height?: number; actualLabel?: string }) {
  const NAMES: Record<string, string> = { actual: actualLabel, current: 'Current budget', proposed: 'Proposed' }
  const data = rows.map((r) => ({ ...r, label: monthShort(r.month) }))
  const ticks = niceTicks(Math.max(...rows.flatMap((r) => [r.actual, r.current, r.proposed])))
  return (
    <div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 12, right: 6, bottom: 0, left: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} />
            <YAxis width={50} tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={usdAxis} ticks={ticks} domain={[0, ticks[ticks.length - 1]]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--color-sunk)' }} formatter={(v, name) => [usd(Number(v)), NAMES[String(name)] ?? String(name)]} />
            <Bar dataKey="actual" name="actual" fill="var(--color-bar)" fillOpacity={showProposed ? 0.55 : 1} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Line dataKey="current" name="current" stroke="var(--color-mute)" strokeWidth={2} dot={false} isAnimationActive={false} />
            {showProposed && <Line dataKey="proposed" name="proposed" stroke="var(--color-accent)" strokeWidth={2.5} dot={false} isAnimationActive={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-meta text-ink/80">
        {showProposed && <li className="flex items-center gap-1.5"><span className="w-4 border-t-[3px] border-accent" />Proposed</li>}
        <li className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-mute" />Current budget</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-sm bg-bar" />{actualLabel}</li>
      </ul>
    </div>
  )
}
