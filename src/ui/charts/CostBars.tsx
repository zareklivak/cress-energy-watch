import { Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { monthShort, num, numK, usd } from '../../engine/format'
import { METERS, type Finding, type MeterId, type MonthRow } from '../../engine/types'
import type { Units } from '../../state/store'
import { AXIS_TICK, niceTicks, TOOLTIP_STYLE, usdAxis } from './axis'
import { SEV_COLOR, worstByMonth } from './chartData'

type Datum = { month: string; label: string; rest: number; top: number; stack: number; budget: number | null; flag: string | null }

/**
 * Monthly cost bars with the budget as a muted dashed line and a dot above each flagged month.
 * The selected month splits out its biggest meter, so "X was 64% of the bill" is visible.
 */
export function CostBars({ rows, findings, selected, units, height = 260, label }: { rows: MonthRow[]; findings: Finding[]; selected?: string; units: Units; height?: number; label?: (m: MeterId) => string }) {
  const worst = worstByMonth(findings)
  const sel = rows.find((r) => r.month === selected)
  const topMeter = sel ? METERS.reduce((a, b) => (sel.meters[b] > sel.meters[a] ? b : a)) : null
  const data: Datum[] = rows.map((r) => {
    const total = units === 'usd' ? r.calcCost : r.totalCuft
    const top = r.month === selected && topMeter ? (units === 'usd' ? r.meters[topMeter] * r.rate : r.meters[topMeter]) : 0
    return {
      month: r.month,
      label: monthShort(r.month),
      rest: total - top,
      top,
      stack: Math.max(total, units === 'usd' ? r.budget : 0),
      budget: units === 'usd' ? r.budget : null,
      flag: worst[r.month] ? SEV_COLOR[worst[r.month]] : null,
    }
  })
  const ticks = niceTicks(Math.max(...data.map((d) => Math.max(d.rest + d.top, d.budget ?? 0))))
  const fmt = (v: number) => (units === 'usd' ? usdAxis(v) : numK(v))
  const fmtFull = (v: number) => (units === 'usd' ? usd(v) : `${num(v)} cu ft`)
  // Flag dot: a fixed gap above the top of each month's stack, drawn by an invisible line
  // whose dots read their own data point (bar labels don't receive a reliable index).
  const renderFlag = (props: unknown) => {
    const p = props as { cx?: number; cy?: number; payload?: Datum }
    const key = `flag-${p.payload?.month}`
    if (!p.payload?.flag || p.cx == null || p.cy == null) return <g key={key} />
    // One fixed row along the top of the plot, so markers never read as a data series.
    return <circle key={key} cx={p.cx} cy={9} r={5} fill={p.payload.flag} stroke="#fff" strokeWidth={1.5} />
  }
  const NAMES: Record<string, string> = { rest: topMeter && label ? 'Rest of the lodge' : units === 'usd' ? 'Cost' : 'Gas used', top: topMeter && label ? label(topMeter) : 'Top meter', budget: 'Budget' }
  return (
    <div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 20, right: 6, bottom: 0, left: 0 }} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} />
            <YAxis width={50} tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={fmt} ticks={ticks} domain={[0, ticks[ticks.length - 1]]} />
            <Tooltip
              cursor={{ fill: 'var(--color-sunk)' }}
              contentStyle={TOOLTIP_STYLE}
              formatter={(v, name) => (Number(v) === 0 && name === 'top' ? [null, null] : [fmtFull(Number(v)), NAMES[String(name)] ?? String(name)])}
            />
            <Bar dataKey="rest" name="rest" stackId="m" isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.month} fill={d.month === selected ? 'color-mix(in oklab, var(--color-accent) 35%, white)' : 'var(--color-bar)'} />
              ))}
            </Bar>
            {sel && (
              <Bar dataKey="top" name="top" stackId="m" fill="var(--color-accent)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            )}
            <Line dataKey="stack" stroke="none" dot={renderFlag} activeDot={false} tooltipType="none" legendType="none" isAnimationActive={false} />
            {units === 'usd' && (
              <Line dataKey="budget" name="budget" type="linear" stroke="var(--color-mute)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-mute">
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-sm bg-bar" />{units === 'usd' ? 'Monthly cost' : 'Monthly gas use'}</li>
        {sel && topMeter && label && (
          <li className="flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-sm bg-accent" />{label(topMeter)} in {monthShort(sel.month)}</li>
        )}
        {units === 'usd' && <li className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-mute" />Budget</li>}
        {data.some((d) => d.flag) && <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-high" /><span className="-ml-1 h-2.5 w-2.5 rounded-full bg-medium-mark" />Flagged month (red high, amber medium)</li>}
      </ul>
    </div>
  )
}
