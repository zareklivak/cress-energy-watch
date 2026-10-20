import { describe, expect, it } from 'vitest'
import { parseCsv, ParseError } from './parse'
import { SAMPLE_CSV } from './sample'

const HEADER = 'month,m3,m7,m1,m2,pool,m4,m5,m6,total_cuft,rate,calc_cost,alt_cost,budget'
const row = (month: string, total = 8000) => `${month},1000,1000,1000,1000,1000,1000,1000,1000,${total},0.06,480,480,500`

describe('parseCsv', () => {
  it('parses the sample sheet: 9 months, no warnings', () => {
    const { rows, warnings } = parseCsv(SAMPLE_CSV)
    expect(rows).toHaveLength(9)
    expect(warnings).toEqual([])
    expect(rows[0].month).toBe('2025-12')
    expect(rows[0].totalCuft).toBe(Object.values(rows[0].meters).reduce((a, b) => a + b, 0))
  })

  it('accepts a byte-order mark, CRLF line endings, blank lines and quoted thousands', () => {
    const text = `${String.fromCharCode(0xfeff)}${HEADER}\r\n${row('2026-01')}\r\n\r\n"2026-02","1,000",1000,1000,1000,1000,1000,1000,1000,"8,000",0.06,"$480",480,500\r\n${row('2026-03')}\r\n`
    const { rows } = parseCsv(text)
    expect(rows.map((r) => r.month)).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(rows[1].meters.m3).toBe(1000)
    expect(rows[1].calcCost).toBe(480)
  })

  it('reads a blank meter cell as 0 (SPEC: meter 7 blank in Jul/Aug)', () => {
    const text = [HEADER, row('2026-01'), '2026-02,1000,,1000,1000,1000,1000,1000,1000,7000,0.06,420,420,500', row('2026-03')].join('\n')
    expect(parseCsv(text).rows[1].meters.m7).toBe(0)
  })

  it('warns, but keeps going, when meters do not add up to the total', () => {
    const text = [HEADER, row('2026-01', 9000), row('2026-02'), row('2026-03')].join('\n')
    expect(parseCsv(text).warnings).toEqual(['2026-01: meters add up to 8,000 cu ft, but the total says 9,000.'])
  })

  it.each([
    ['', 'The file has no data rows.'],
    ['month,m3\n2026-01,5', 'The file is missing these columns: m7, m1, m2, pool, m4, m5, m6, total_cuft, rate, calc_cost, alt_cost, budget.'],
    [[HEADER, row('Jan 2026'), row('2026-02'), row('2026-03')].join('\n'), 'Row 2: month "Jan 2026" should look like 2026-05.'],
    [[HEADER, row('2026-01'), row('2026-02')].join('\n'), 'Need at least 3 months of data to learn what normal looks like.'],
    [[HEADER, row('2026-01'), row('2026-03'), row('2026-04')].join('\n'), 'Months must be consecutive and in order: 2026-01 is followed by 2026-03.'],
    [[HEADER, row('2026-01'), '2026-02,1000,1000,1000,1000,abc,1000,1000,1000,8000,0.06,480,480,500', row('2026-03')].join('\n'), 'Row 3 (2026-02): "pool" is not a valid number.'],
    [[HEADER, row('2026-01'), '2026-02,1000,1000,1000,1000,1000,1000,1000,1000,8000,0.06,480,480,', row('2026-03')].join('\n'), 'Row 3 (2026-02): "budget" is empty.'],
  ])('rejects bad input with a plain-English message (%#)', (text, message) => {
    expect(() => parseCsv(text)).toThrow(ParseError)
    expect(() => parseCsv(text)).toThrow(message)
  })
})
