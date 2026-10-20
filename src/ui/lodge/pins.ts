import site from '../../data/site.json'
import { monthLong, mult, usd } from '../../engine/format'
import { median } from '../../engine/stats'
import { METERS, type Finding, type MeterId, type MonthRow } from '../../engine/types'
import { SEASON_WIDE } from '../charts/chartData'

export type PinTone = 'high' | 'medium' | 'info' | 'ok' | 'expected'
export type Pin = { meter: MeterId; label: string; tone: PinTone; note: string | null; x: number; y: number; z: number; building: string; href: string; title: string }

/** Traced site plan in metres (x east, y north). Pin spots are ILLUSTRATIVE until the owner confirms meter locations. */
export const SITE = site

export const TONE_COLOR: Record<PinTone, string> = {
  high: '#b3381f',
  medium: '#9a6508', // darker than the medium-mark token so the dot keeps 3:1 against grass and walls
  info: '#45535e',
  ok: '#1f5a4a',
  expected: '#6b726e',
}
/** Plain names for the traced buildings, for meter cards and captions. */
export const BUILDING_NAME: Record<string, string> = {
  lodge: 'the main lodge',
  pool: 'the pool',
  'west-north': 'the north-west building',
  'west-mid': 'the west building',
  'west-south': 'the south-west building',
  'south-centre': 'the south building',
  'south-east': 'the south-east building',
}

/** Which building a meter's (illustrative) pin sits on. */
export function buildingOf(m: MeterId): string {
  return BUILDING_NAME[(SITE.pins[m] as { building: string }).building] ?? 'the site'
}

const RANK: Record<PinTone, number> = { high: 0, medium: 1, info: 2, expected: 3, ok: 4 }

export function bbox(points: [number, number][]) {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}

/** Months a finding points at for one meter: its highlighted months on band charts, otherwise the finding's months. */
function monthsFor(f: Finding, m: MeterId): string[] {
  if (f.chart.type === 'band') {
    const s = f.chart.series.find((x) => x.meter === m)
    if (s) return s.highlight
  }
  return f.months
}

/** One pin per meter, coloured only by what is happening in `month`. */
export function makePins({ findings, label, month, rows }: { findings: Finding[]; label: (m: MeterId) => string; month: string; rows: MonthRow[] }): Pin[] {
  const row = rows.find((r) => r.month === month)
  return METERS.map((m) => {
    const spot = SITE.pins[m] as { x: number; y: number; z: number; building: string }
    const here = findings.filter((f) => f.meters.includes(m) && !SEASON_WIDE.includes(f.kind) && monthsFor(f, m).includes(month))
    const open = here.filter((f) => f.status === 'new' || f.status === 'reviewing')
    const worst = [...open].sort((a, b) => RANK[a.severity] - RANK[b.severity])[0]
    const tone: PinTone = worst ? worst.severity : here.some((f) => f.status === 'expected') ? 'expected' : 'ok'
    const med = median(rows.map((r) => r.meters[m]))
    const multiple = row && med > 0 ? row.meters[m] / med : NaN
    const note = tone === 'high' && Number.isFinite(multiple) ? `${mult(multiple)} normal` : null
    const cost = row ? `${monthLong(month)} ${usd(row.meters[m] * row.rate)}` : null
    const state = worst ? worst.headline : tone === 'expected' ? 'Expected this month' : 'Normal this month'
    return {
      meter: m,
      label: label(m),
      tone,
      note,
      ...spot,
      href: worst ? `/anomalies/${worst.id}` : `/meters/${m}`,
      title: [label(m), cost, state].filter(Boolean).join(' · '),
    }
  })
}

/** The strongest flag tone on each building this month, used for the soft wall tint. */
export function buildingTones(pins: Pin[]): Record<string, PinTone> {
  const out: Record<string, PinTone> = {}
  for (const p of pins) if (!out[p.building] || RANK[p.tone] < RANK[out[p.building]]) out[p.building] = p.tone
  return out
}
