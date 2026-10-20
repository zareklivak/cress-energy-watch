import { buildingTones, SITE, TONE_COLOR, type Pin } from './pins'
import { SITE_COLORS as C, WALL_TINT } from './siteColors'

const pts = (poly: number[][]) => poly.map(([x, y]) => `${x},${-y}`).join(' ')

/** Flat site plan (north up), drawn from the same traced site as the 3D view. Used on phones and as the WebGL fallback. */
export function LodgeMap({ pins, expanded = false, onOpen, highlight }: { pins: Pin[]; expanded?: boolean; onOpen: (href: string) => void; highlight?: string }) {
  const f = SITE.frame
  const pad = 10
  const w = f.maxX - f.minX + 2 * pad
  const h = f.maxY - f.minY + 2 * pad
  const font = Math.max(w, h) / 30
  const tones = buildingTones(pins)
  return (
    <svg viewBox={`${f.minX - pad} ${-f.maxY - pad} ${w} ${h}`} className="h-full w-full" role="group" aria-label="Site plan of the lodge with illustrative meter locations">
      <rect x={f.minX - pad} y={-f.maxY - pad} width={w} height={h} fill={C.grass} />
      {SITE.roads.map((r, i) => <polyline key={i} points={pts(r.points)} fill="none" stroke={C.road} strokeWidth={r.width} strokeLinejoin="round" />)}
      <circle cx={SITE.roundabout.center[0]} cy={-SITE.roundabout.center[1]} r={(SITE.roundabout.inner + SITE.roundabout.outer) / 2} fill="none" stroke={C.drive} strokeWidth={SITE.roundabout.outer - SITE.roundabout.inner} />
      <circle cx={SITE.roundabout.center[0]} cy={-SITE.roundabout.center[1]} r={SITE.roundabout.inner} fill={C.island} />
      <polygon points={pts(SITE.parking.corners)} fill={C.drive} />
      <polygon points={pts(SITE.courts.surround.corners)} fill={C.courtSurround} />
      {SITE.courts.courts.map((c, i) => <polygon key={i} points={pts(c.corners)} fill={C.court} stroke={C.line} strokeWidth={0.25} />)}
      <polygon points={pts(SITE.pool.deck.corners)} fill={C.deck} />
      <polygon points={pts(SITE.pool.polygon)} fill={C.water} />
      {SITE.pool.spas.map((s, i) => <circle key={i} cx={s.center[0]} cy={-s.center[1]} r={s.r} fill={C.spa} stroke={C.deck} strokeWidth={0.5} />)}
      {SITE.trees.map((t, i) => <circle key={i} cx={t.x} cy={-t.y} r={2 * t.s} fill={t.kind === 'pine' ? C.pine : C.leaf} opacity={0.85} />)}
      <polygon points={pts(SITE.lodge.polygon)} fill={(tones.lodge && WALL_TINT[tones.lodge]) ?? C.plan} stroke={C.roof} strokeWidth={0.6} />
      {SITE.blocks.map((b) => <polygon key={b.id} points={pts(b.corners)} fill={(tones[b.id] && WALL_TINT[tones[b.id]]) ?? C.plan} stroke={C.roof} strokeWidth={0.6} />)}
      {pins.map((p) => {
        const focus = highlight === p.meter
        const strong = p.tone === 'high' || focus
        const showLabel = expanded || strong
        const dim = highlight !== undefined && !focus
        return (
          <g
            key={p.meter}
            role="link"
            tabIndex={0}
            aria-label={p.title}
            onClick={() => onOpen(p.href)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(p.href) } }}
            opacity={dim ? 0.35 : 1}
            className="cursor-pointer outline-none focus-visible:[&>circle:first-of-type]:stroke-ink"
          >
            <title>{p.title}</title>
            <circle cx={p.x} cy={-p.y} r={strong ? font * 0.75 : font * 0.5} fill={TONE_COLOR[p.tone]} stroke={C.line} strokeWidth={font / 6} />
            <circle cx={p.x} cy={-p.y} r={font * 2} fill="transparent" />
            {showLabel && (
              <text x={p.x} y={-p.y - font * 1.1} fontSize={strong ? font * 1.05 : font * 0.85} textAnchor="middle" fill={p.tone === 'high' ? TONE_COLOR.high : 'rgba(29,35,33,0.9)'} fontWeight={strong ? 700 : 500} stroke={C.plan} strokeWidth={font / 4} paintOrder="stroke">
                {p.label}{strong && p.note ? ` · ${p.note}` : ''}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
