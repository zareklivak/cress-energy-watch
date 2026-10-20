import { METERS, type MeterId, type MonthRow } from './types'

export class ParseError extends Error {}

export type ParseResult = { rows: MonthRow[]; warnings: string[] }

const REQUIRED = ['month', ...METERS, 'total_cuft', 'rate', 'calc_cost', 'alt_cost', 'budget'] as const

/** Split one CSV line, honoring double quotes ("12,345" stays one cell). */
function splitLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++ } else quoted = !quoted
    } else if (ch === ',' && !quoted) {
      cells.push(cur); cur = ''
    } else cur += ch
  }
  cells.push(cur)
  return cells.map((c) => c.trim())
}

/** '12,345' / '$1,234.50' / '' -> number. Empty returns null. */
function toNumber(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, '')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : NaN
}

function nextMonth(month: string): string {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

/**
 * Parse the utility sheet (SPEC section 7 format). Throws ParseError with a
 * plain-English message a property manager can act on.
 */
export function parseCsv(text: string): ParseResult {
  const lines = text.replace(new RegExp(`^${String.fromCharCode(0xfeff)}`), '').split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length < 2) throw new ParseError('The file has no data rows.')
  const header = splitLine(lines[0]).map((h) => h.toLowerCase())
  const missing = REQUIRED.filter((c) => !header.includes(c))
  if (missing.length) throw new ParseError(`The file is missing these columns: ${missing.join(', ')}.`)
  const col = (name: string) => header.indexOf(name)

  const warnings: string[] = []
  const rows: MonthRow[] = lines.slice(1).map((line, idx) => {
    const lineNo = idx + 2
    const cells = splitLine(line)
    const month = cells[col('month')] ?? ''
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new ParseError(`Row ${lineNo}: month "${month}" should look like 2026-05.`)
    }
    const read = (name: string, allowBlank: boolean): number => {
      const v = toNumber(cells[col(name)] ?? '')
      if (v === null) {
        if (allowBlank) return 0
        throw new ParseError(`Row ${lineNo} (${month}): "${name}" is empty.`)
      }
      if (Number.isNaN(v) || v < 0) {
        throw new ParseError(`Row ${lineNo} (${month}): "${name}" is not a valid number.`)
      }
      return v
    }
    const meters = {} as Record<MeterId, number>
    for (const m of METERS) meters[m] = read(m, true)
    const row: MonthRow = {
      month,
      meters,
      totalCuft: read('total_cuft', false),
      rate: read('rate', false),
      calcCost: read('calc_cost', false),
      altCost: read('alt_cost', false),
      budget: read('budget', false),
    }
    if (row.rate <= 0) throw new ParseError(`Row ${lineNo} (${month}): rate must be above zero.`)
    if (row.budget <= 0) throw new ParseError(`Row ${lineNo} (${month}): budget must be above zero.`)
    const sum = METERS.reduce((s, m) => s + meters[m], 0)
    if (Math.abs(sum - row.totalCuft) > 1) {
      warnings.push(`${month}: meters add up to ${sum.toLocaleString('en-US')} cu ft, but the total says ${row.totalCuft.toLocaleString('en-US')}.`)
    }
    return row
  })

  if (rows.length < 3) throw new ParseError('Need at least 3 months of data to learn what normal looks like.')
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].month !== nextMonth(rows[i - 1].month)) {
      throw new ParseError(`Months must be consecutive and in order: ${rows[i - 1].month} is followed by ${rows[i].month}.`)
    }
  }
  return { rows, warnings }
}
