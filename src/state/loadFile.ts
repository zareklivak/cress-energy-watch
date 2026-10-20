import { normalizedToCsv, type NormalizedResult } from '../engine/normalized'
import { parseCsv, ParseError } from '../engine/parse'
import type { Dataset } from './store'

export const MAX_UPLOAD_BYTES = 3_000_000

export class UploadError extends Error {}

export type NormalizeFn = (req: { fileName: string; kind: 'csv' | 'pdf'; text?: string; base64?: string }) => Promise<NormalizedResult>
export type UploadOutcome = { kind: 'ready'; dataset: Dataset } | { kind: 'check'; dataset: Dataset; notes: string[] }

const dataset = (fileName: string, text: string, readByAi = false): Dataset => {
  const { rows, warnings } = parseCsv(text)
  return { source: 'upload', fileName, rows, warnings, analyzedAt: new Date().toISOString(), readByAi }
}

/** Calls the server's AI reader. Every failure becomes a plain-English UploadError. */
export const callNormalize: NormalizeFn = async (req) => {
  let res: Response
  try {
    res = await fetch('/api/normalize', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req) })
  } catch {
    throw new UploadError("Couldn't reach the AI reader. Check your connection and try again.")
  }
  const body = (await res.json().catch(() => null)) as (NormalizedResult & { error?: string }) | null
  if (!res.ok || !body) throw new UploadError(body?.error ?? "The AI reader isn't available right now. Try again in a minute.")
  return body
}

function toBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

async function viaAi(fileName: string, req: Parameters<NormalizeFn>[0], normalize: NormalizeFn): Promise<UploadOutcome> {
  const { rows, notes } = await normalize(req)
  try {
    return { kind: 'check', dataset: dataset(fileName, normalizedToCsv(rows), true), notes }
  } catch (e) {
    if (e instanceof ParseError) throw new UploadError("We couldn't read monthly gas readings from this file.")
    throw e
  }
}

/** Read a dropped or chosen file. Clean CSV/Excel load directly; anything else is read by the AI and returned for a check. */
export async function readUpload(file: File, normalize: NormalizeFn = callNormalize): Promise<UploadOutcome> {
  const name = file.name.toLowerCase()
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError('That file is over 3 MB. Try a smaller export or one month per PDF.')

  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    return viaAi(file.name, { fileName: file.name, kind: 'pdf', base64: toBase64(new Uint8Array(await file.arrayBuffer())) }, normalize)
  }

  let text: string
  let strict: string
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await import('xlsx')
    const book = XLSX.read(await file.arrayBuffer())
    const first = book.Sheets[book.SheetNames[0]]
    // Excel stores "2026-06" as a date serial (46174); turn the month column back into YYYY-MM.
    const range = XLSX.utils.decode_range(first['!ref'] ?? 'A1')
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      const cell = first[XLSX.utils.encode_cell({ r, c: range.s.c })]
      if (cell?.t === 'n' && cell.v > 20000 && cell.v < 80000) {
        const d = XLSX.SSF.parse_date_code(cell.v)
        first[XLSX.utils.encode_cell({ r, c: range.s.c })] = { t: 's', v: `${d.y}-${String(d.m).padStart(2, '0')}` }
      }
    }
    strict = XLSX.utils.sheet_to_csv(first)
    text = book.SheetNames.map((n) => `# Sheet: ${n}\n${XLSX.utils.sheet_to_csv(book.Sheets[n])}`).join('\n\n')
  } else if (name.endsWith('.csv') || file.type === 'text/csv') {
    text = strict = await file.text()
  } else {
    throw new UploadError('Cress reads CSV, Excel (.xlsx, .xls) and PDF files.')
  }

  try {
    return { kind: 'ready', dataset: dataset(file.name, strict) }
  } catch (e) {
    if (!(e instanceof ParseError)) throw e
    return viaAi(file.name, { fileName: file.name, kind: 'csv', text }, normalize)
  }
}
