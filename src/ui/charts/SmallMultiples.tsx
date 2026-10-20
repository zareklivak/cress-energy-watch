import { Link } from 'react-router-dom'
import { Area, ComposedChart, Line, ReferenceArea, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { monthShort, pct, usdK } from '../../engine/format'
import { sum } from '../../engine/stats'
import { METERS, type Finding, type MeterId, type MonthRow, type Severity } from '../../engine/types'
import { buildingOf } from '../lodge/pins'
import { normalBand, SEV_COLOR } from './chartData'

/** Worst open severity per month for one meter, from findings that highlight that meter's months. */
function meterFlags(findings: Finding[], m: MeterId): Record<string, Severity> {
  const order: Record<Severity, number> = { high: 0, medium: 1, info: 2 }
  const out: Record<string, Severity> = {}
  for (const f of findings) {
    if (f.status !== 'new' && f.status !== 'reviewing') continue
    if (f.chart.type !== 'band') continue
    for (const s of f.chart.series) {
      if (s.meter !== m) continue
      for (const mo of s.highlight) if (!out[mo] || order[f.severity] < order[out[mo]]) out[mo] = f.severity
    }
  }
  return out
}

/** One small chart per meter. Shared scale makes the biggest user obvious. */
export function SmallMultiples({ rows, findings, label, shared }: { rows: MonthRow[]; findings: Finding[]; label: (m: MeterId) => string; shared: boolean }) {
  const globalMax = Math.max(...rows.flatMap((r) => METERS.map((m) => r.meters[m])))
  const totalCuft = sum(rows.map((r) => r.totalCuft))
  const ranked = [...METERS].sort((a, b) => sum(rows.map((r) => r.meters[b])) - sum(rows.map((r) => r.meters[a])))
  const first = monthShort(rows[0].month)
  const last = monthShort(rows[rows.length - 1].month)
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
      {ranked.map((m) => {
        const xs = rows.map((r) => r.meters[m])
        const band = normalBand(xs)
        const shutdown = findings.find((f) => f.kind === 'seasonal-shutdown' && f.meters.includes(m))
        const flags = meterFlags(findings, m)
        const data = rows.map((r) => ({ label: monthShort(r.month), value: r.meters[m], band: [band.lo, band.hi] as [number, number], flag: flags[r.month] ?? null }))
        const renderDot = (props: unknown) => {
          const p = props as { cx?: number; cy?: number; index?: number }
          const d = data[p.index ?? 0]
          const key = `d-${p.index}`
          if (!d?.flag || p.cx == null || p.cy == null) return <g key={key} />
          return <circle key={key} cx={p.cx} cy={p.cy} r={4} fill={SEV_COLOR[d.flag]} stroke="#fff" strokeWidth={1.5} />
        }
        return (
          <Link key={m} to={`/meters/${m}`} className="block min-w-0 rounded-card border border-line bg-card p-3 transition-colors hover:border-ink/30 sm:p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="truncate text-body font-semibold sm:text-lead">{label(m)}</h3>
              <span className="num shrink-0 text-body font-semibold text-ink sm:text-lead">{usdK(sum(rows.map((r) => r.meters[m] * r.rate)))}</span>
            </div>
            <p className="num truncate text-caption text-mute sm:text-meta">
              {pct(sum(xs) / totalCuft)} of gas{Object.keys(flags).length > 0 && <span className={Object.values(flags).includes('high') ? 'font-semibold text-high' : 'font-semibold text-medium'}> · {Object.keys(flags).length} flagged</span>}{shutdown ? ' · shutdown' : ''}
            </p>
            <div className="mt-2 h-16 sm:h-24" role="img" aria-label={`${label(m)} monthly gas use, ${first} to ${last}`}>
              <ResponsiveContainer>
                <ComposedChart data={data} margin={{ top: 8, right: 10, bottom: 6, left: 10 }}>
                  <XAxis dataKey="label" hide />
                  <YAxis hide domain={shared ? [0, globalMax] : [0, 'auto']} />
                  {shutdown && <ReferenceArea x1={monthShort(shutdown.months[0])} x2={monthShort(shutdown.months[shutdown.months.length - 1])} fill="var(--color-sunk)" fillOpacity={1} />}
                  <Area dataKey="band" stroke="none" fill="var(--color-accent-soft)" isAnimationActive={false} />
                  <Line dataKey="value" stroke="var(--color-accent)" strokeWidth={2} dot={renderDot} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex justify-between text-micro text-mute"><span>{first}</span><span>{last}</span></div>
            <p className="mt-1.5 truncate text-caption text-ink/70">On {buildingOf(m)} <span className="text-mute">· illustrative</span></p>
          </Link>
        )
      })}
    </div>
  )
}
