import type { CSSProperties } from 'react'

export const AXIS_TICK = { fill: 'var(--color-mute)', fontSize: 12 }
export const TOOLTIP_STYLE: CSSProperties = {
  borderRadius: 10,
  border: '1px solid var(--color-line)',
  boxShadow: '0 4px 14px rgba(29,35,33,0.08)',
  fontSize: 13,
}

/** Axis dollars: $0, $20K, $12.5K (no needless decimals). */
export function usdAxis(v: number): string {
  return v >= 1000 ? `$${+(v / 1000).toFixed(1)}K` : `$${v}`
}

/** Round axis ticks from 0 (steps of 1, 2, 2.5 or 5 × 10^k, about 4 steps). */
export function niceTicks(max: number, steps = 4): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / steps
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!
  const out: number[] = []
  for (let v = 0; v < max + step; v += step) out.push(v)
  return out
}
