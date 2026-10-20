const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** '2026-05' -> 'May' */
export function monthName(month: string): string {
  return MONTH_NAMES[Number(month.slice(5, 7)) - 1]
}

/** '2026-05' -> 'May 2026' */
export function monthLong(month: string): string {
  return `${monthName(month)} ${month.slice(0, 4)}`
}

/** '2026-05' -> 'May' short form 'May', '2026-02' -> 'Feb' */
export function monthShort(month: string): string {
  return monthName(month).slice(0, 3)
}

/** 54063 -> '$54,063' */
export function usd(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.round(Math.abs(n)).toLocaleString('en-US')}`
}

/** 48210 -> '$48.2K', 840 -> '$840' */
export function usdK(n: number): string {
  if (Math.abs(n) < 1000) return usd(n)
  return `${n < 0 ? '-' : ''}$${(Math.abs(n) / 1000).toFixed(1)}K`
}

/** 491533 -> '491,533' */
export function num(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

/** 338496 -> '338K' */
export function numK(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  return Math.abs(n) < 1000 ? num(n) : `${Math.round(n / 1000)}K`
}

/** Multiples: below 3 keep one decimal (2.1x), from 3 round to whole (4x). */
export function mult(x: number): string {
  if (!Number.isFinite(x)) return '—'
  return x < 3 ? `${x.toFixed(1)}×` : `${Math.round(x)}×`
}

/** 0.636 -> '64%' */
export function pct(x: number): string {
  return `${Math.round(x * 100)}%`
}

/** Join names: 'A', 'A and B', 'A, B and C'. */
export function joinList(xs: string[]): string {
  return xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`
}

/**
 * A meter label as it reads mid-sentence: ordinary capitalized words are
 * lowercased ('Pool' -> 'pool', 'Meter 7' -> 'meter 7'), acronyms are kept
 * ('HVAC Boiler' -> 'HVAC boiler').
 */
export function inSentence(label: string): string {
  return label.split(' ').map((w) => (/^[A-Z][a-z]/.test(w) ? w[0].toLowerCase() + w.slice(1) : w)).join(' ')
}
