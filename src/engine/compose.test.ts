import { describe, expect, it } from 'vitest'
import { compose } from './compose'
import { SAMPLE_ROWS, SEASON_HDD } from './sample'
import type { Finding, FindingKind } from './types'

const findings = compose(SAMPLE_ROWS, SEASON_HDD)
const flags = findings.filter((f) => f.status !== 'expected')
const byKind = (kind: FindingKind): Finding => {
  const f = findings.find((x) => x.kind === kind)
  if (!f) throw new Error(`no ${kind} finding`)
  return f
}
const ORDER = { high: 0, medium: 1, info: 2 } as const

describe('sample acceptance: the 8 SPEC stories fire, and nothing else', () => {
  it('produces exactly 8 flags plus 1 expected item', () => {
    expect(flags).toHaveLength(8)
    expect(findings.filter((f) => f.status === 'expected')).toHaveLength(1)
    expect(new Set(flags.map((f) => f.kind))).toEqual(new Set<FindingKind>([
      'over-budget', 'dominant-meter', 'estimated-reads', 'drop-out',
      'repeat-month', 'entry-error', 'cost-mismatch', 'budget-shape',
    ]))
  })

  it('#1 May is over budget, driven by the pool spike in Apr-May', () => {
    const f = byKind('over-budget')
    expect(f.severity).toBe('high')
    expect(f.months).toEqual(['2026-05'])
    expect(f.meters).toEqual(['pool'])
    expect(f.headline).toMatch(/^May was [\d.]+× budget: pool gas [\d.]+× normal$/)
    expect(f.facts.meterMultiple).toBeGreaterThan(3)
    expect(f.chart).toEqual({ type: 'band', series: [{ meter: 'pool', highlight: ['2026-04', '2026-05'] }] })
  })

  it('#2 the pool is the biggest gas user', () => {
    const f = byKind('dominant-meter')
    expect(f.meters).toEqual(['pool'])
    expect(f.facts.share).toBeGreaterThan(0.3)
  })

  it('#3 February looks estimated on the same five meters', () => {
    const f = byKind('estimated-reads')
    expect(f.months).toEqual(['2026-02'])
    expect([...f.meters].sort()).toEqual(['m1', 'm2', 'm4', 'm6', 'pool'])
    expect(f.headline).toBe('February looks estimated, not efficient')
    expect(f.evidence.join(' ')).toMatch(/Meter 2 and Meter 6 both show exactly [\d,]+ cu ft/)
  })

  it('#4 single-meter drop-outs: meter 1 in Dec, meter 3 in Jan', () => {
    const f = byKind('drop-out')
    expect(f.meters).toEqual(['m1', 'm3'])
    expect([...f.months].sort()).toEqual(['2025-12', '2026-01'])
  })

  it('#5 August looks copied from July: 6 of 8 meters identical', () => {
    const f = byKind('repeat-month')
    expect(f.months).toEqual(['2026-08'])
    expect(f.facts.repeated).toBe(6)
  })

  it('#6 July meter 1 entry error: the bill matches its June value', () => {
    const f = byKind('entry-error')
    expect(f.months).toEqual(['2026-07'])
    expect(f.meters).toEqual(['m1'])
    expect(f.facts.correctCuft).toBe(SAMPLE_ROWS[6].meters.m1)
  })

  it('#7 calculated vs billed disagree in Dec and Jan', () => {
    expect(byKind('cost-mismatch').months).toEqual(['2025-12', '2026-01'])
  })

  it('#8 the budget shape is miscalibrated on all three signals', () => {
    expect(byKind('budget-shape').facts.signals).toBe(3)
  })
})

describe('sample acceptance: normal behavior is not flagged', () => {
  it('meter 7 summer shutdown is Expected, never a flag', () => {
    const m7 = findings.filter((f) => f.meters.includes('m7'))
    expect(m7).toHaveLength(1)
    expect(m7[0].kind).toBe('seasonal-shutdown')
    expect(m7[0].months).toEqual(['2026-06', '2026-07', '2026-08'])
    expect(m7[0].headline).toBe('Expected: meter 7 seasonal shutdown')
  })

  it('only the pool spike and the two drop-outs are highlighted', () => {
    const highlighted = flags.flatMap((f) =>
      f.chart.type === 'band' ? f.chart.series.map((s) => `${s.meter}@${s.highlight.join(',')}`) : [])
    expect(highlighted).toEqual(['pool@2026-04,2026-05', 'm1@2025-12', 'm3@2026-01'])
  })

  it('orders flags by severity with expected items last', () => {
    const sev = flags.map((f) => ORDER[f.severity])
    expect(sev).toEqual([...sev].sort((a, b) => a - b))
    expect(findings[findings.length - 1].kind).toBe('seasonal-shutdown')
  })

  it('carries renamed meter labels into headlines', () => {
    const renamed = compose(SAMPLE_ROWS, SEASON_HDD, {
      m3: 'Meter 3', m7: 'Boiler room', m1: 'Meter 1', m2: 'Meter 2',
      pool: 'Pool & spa', m4: 'Meter 4', m5: 'Meter 5', m6: 'Meter 6',
    })
    expect(renamed.find((f) => f.kind === 'over-budget')!.headline).toMatch(/: pool & spa gas [\d.]+× normal$/)
    expect(renamed.find((f) => f.kind === 'seasonal-shutdown')!.headline).toBe('Expected: boiler room seasonal shutdown')
  })
})

describe('a new meter with no usual level', () => {
  it('never says Infinity× when the meter median is zero', () => {
    // m7 reads zero for most of the season, then jumps in the over-budget month.
    const rows = SAMPLE_ROWS.map((r) => ({ ...r, meters: { ...r.meters, m7: 0 } }))
    const may = rows.findIndex((r) => r.month === '2026-05')
    rows[may] = { ...rows[may], meters: { ...rows[may].meters, pool: 0, m7: 900_000 } }
    const text = compose(rows, SEASON_HDD).flatMap((f) => [f.headline, ...f.evidence]).join(' ')
    expect(text).not.toMatch(/Infinity|NaN/)
  })
})
