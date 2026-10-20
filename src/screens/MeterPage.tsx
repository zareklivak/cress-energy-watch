import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { joinList, monthShort, mult, numK, pct, usdK } from '../engine/format'
import { median, sum } from '../engine/stats'
import { METERS, type MeterId } from '../engine/types'
import { useApp } from '../state/store'
import { Card, MicroLabel } from '../ui/Card'
import { BandChart } from '../ui/charts/BandChart'
import { normalBand } from '../ui/charts/chartData'
import { FlagCard } from '../ui/FlagCard'
import { LodgeMap } from '../ui/lodge/LodgeMap'
import { buildingOf, makePins } from '../ui/lodge/pins'
import { PageHeader } from '../ui/shell/PageHeader'
import { StatTile } from '../ui/StatTile'
import NotFound from './NotFound'

export default function MeterPage() {
  const { meter } = useParams()
  const { rows, findings, label, state } = useApp()
  const navigate = useNavigate()
  const pins = useMemo(() => makePins({ findings, label, month: state.month, rows }), [findings, label, state.month, rows])
  if (!METERS.includes(meter as MeterId)) return <NotFound message="We don't have a meter by that name." />
  const m = meter as MeterId
  const xs = rows.map((r) => r.meters[m])
  const related = findings.filter((f) => f.meters.includes(m))
  const highlight = related.filter((f) => f.chart.type === 'band').flatMap((f) => (f.chart.type === 'band' ? f.chart.series.filter((s) => s.meter === m).flatMap((s) => s.highlight) : []))
  // Other month-specific flags on this meter (e.g. February's estimated reads) shown as amber points.
  const also = related
    .filter((f) => f.chart.type !== 'band' && f.months.length < rows.length && (f.status === 'new' || f.status === 'reviewing'))
    .flatMap((f) => f.months)
    .filter((mo) => !highlight.includes(mo))
  const unnamed = state.labels[m].trim() === '' || /^Meter \d+$/.test(state.labels[m])
  const usual = median(xs)
  const rate = sum(rows.map((r) => r.calcCost)) / sum(rows.map((r) => r.totalCuft))
  // Headline by what actually happened: shutdown, spikes above the band, or drops below it.
  const band = normalBand(xs)
  const shutdownMonths = related.filter((f) => f.kind === 'seasonal-shutdown').flatMap((f) => f.months)
  // Flagged months lead the headline; otherwise any month outside the band.
  const flagged = rows.filter((r) => highlight.includes(r.month) && !shutdownMonths.includes(r.month))
  const candidates = flagged.length ? flagged : rows.filter((r) => (r.meters[m] > band.hi || r.meters[m] < band.lo) && !shutdownMonths.includes(r.month))
  const highs = candidates.filter((r) => r.meters[m] > usual)
  const lows = candidates.filter((r) => r.meters[m] < usual)
  const names = (rs: typeof rows) => joinList(rs.map((r) => monthShort(r.month)))
  const chartTitle = highs.length && usual > 0
    ? `${names(highs)} ran up to ${mult(Math.max(...highs.map((r) => r.meters[m])) / usual)} a usual month`
    : lows.length && usual > 0
      ? `${names(lows)} fell to ${pct(Math.min(...lows.map((r) => r.meters[m])) / usual)} of a usual month`
      : shutdownMonths.length
        ? `Off for the summer in ${names(rows.filter((r) => shutdownMonths.includes(r.month)))} (expected)`
        : 'Stayed inside its normal range'
  return (
    <>
      <PageHeader eyebrow="Meter" title={label(m)} />
      {unnamed && (
        <p className="-mt-2 mb-4 text-body text-mute">
          What does this meter serve? <Link to="/settings" className="font-semibold text-accent hover:underline">Name it in Settings</Link>
        </p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatTile label="Season" value={usdK(sum(rows.map((r) => r.meters[m] * r.rate)))} sub={`${numK(sum(xs))} cu ft`} />
        <StatTile label="Share" value={pct(sum(xs) / sum(rows.map((r) => r.totalCuft)))} sub="of all gas" />
        <StatTile label="Usual month" value={usdK(usual * rate)} sub={`${numK(usual)} cu ft`} />
      </div>
      <Card className="mt-4">
        <p className="text-lead font-semibold">{chartTitle}</p>
        <MicroLabel className="mt-1">cu ft per month</MicroLabel>
        <BandChart rows={rows} meter={m} highlight={highlight} also={also} hitLabel="Flagged" tone={related.every((f) => f.kind === 'seasonal-shutdown') ? 'expected' : 'flag'} height={280} />
      </Card>
      <Card className="mt-4">
        <MicroLabel>Where it is</MicroLabel>
        <p className="mt-1 text-body text-ink/80">On {buildingOf(m)}. Pin locations are illustrative until the meter locations are confirmed.</p>
        <div className="mt-3 h-[240px] overflow-hidden rounded-xl border border-line bg-map"><LodgeMap pins={pins} highlight={m} onOpen={(href) => navigate(href)} /></div>
      </Card>
      <h2 className="mb-3 mt-6 text-title font-semibold">Flags on this meter</h2>
      {related.length ? (
        <div className="grid gap-3 md:grid-cols-2">{related.map((f) => <FlagCard key={f.id} finding={f} />)}</div>
      ) : (
        <Card><p className="text-body text-mute">No flags on this meter. It stayed inside its normal range.</p></Card>
      )}
    </>
  )
}
