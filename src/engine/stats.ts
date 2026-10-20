export function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Median absolute deviation. */
export function mad(xs: number[]): number {
  const m = median(xs)
  return median(xs.map((x) => Math.abs(x - m)))
}

/** Robust z-score: 0.6745 * (x - median) / MAD. All zeros when MAD is 0. */
export function robustZ(xs: number[]): number[] {
  const m = median(xs)
  const d = mad(xs)
  return xs.map((x) => (d === 0 ? 0 : (0.6745 * (x - m)) / d))
}

export function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0)
}
