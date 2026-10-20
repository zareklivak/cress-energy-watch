// Builds the demo's illustrative site plan: an invented resort lodge with five condo buildings,
// a pool deck, tennis courts, a roundabout entry and parking. Laid out on a 732x537 px sketch grid
// (north up) and converted to metres. Fictional, not a real property.
import { writeFileSync } from 'node:fs'

const S = 0.256 // metres per sketch pixel
const IMG_LODGE = [420, 220] // lodge centre on the sketch grid
const r2 = (n) => Math.round(n * 100) / 100
const P = ([px, py]) => [r2((px - IMG_LODGE[0]) * S), r2(-(py - IMG_LODGE[1]) * S)]

/** A rectangle given as sketch centre, size in px and a visual clockwise angle in degrees. */
function rect(c, wpx, hpx, deg = 0) {
  const center = P(c), w = r2(wpx * S), d = r2(hpx * S), angle = r2((-deg * Math.PI) / 180)
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const corners = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, y]) => [r2(center[0] + x * cos - y * sin), r2(center[1] + x * sin + y * cos)])
  return { center, w, d, angle, corners }
}

// U-shaped main lodge with chamfered corners, open to the north.
const LODGE_SKETCH = [[300, 175], [310, 165], [370, 165], [370, 205], [470, 205], [470, 165], [530, 165], [540, 175], [540, 265], [530, 275], [310, 275], [300, 265]]
const fp = { polygon: LODGE_SKETCH.map(P), levelsAssumed: 4 }
const xs = fp.polygon.map((p) => p[0]), ys = fp.polygon.map((p) => p[1])
const OSM_LODGE = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]

const FLOOR = 3.2
const blocks = [
  { id: 'west-north', ...rect([110, 110], 100, 85, -10), height: 3 * FLOOR },
  { id: 'west-mid', ...rect([105, 255], 105, 85, 5), height: 2 * FLOOR },
  { id: 'west-south', ...rect([95, 430], 110, 70, -15), height: 3 * FLOOR },
  { id: 'south-centre', ...rect([360, 480], 220, 90, 0), height: 3 * FLOOR },
  { id: 'south-east', ...rect([630, 440], 190, 95, 8), height: 2 * FLOOR },
]
const lodge = { id: 'lodge', polygon: fp.polygon, height: fp.levelsAssumed * FLOOR }

const courts = {
  surround: rect([600, 90], 220, 140, 0),
  courts: [[557, 90], [643, 90]].map((c) => ({ ...rect(c, 30 / S, 15 / S, 90), playW: 23.77, playD: 10.97 })),
}
const pool = {
  polygon: [[330, 330], [360, 318], [410, 322], [430, 340], [415, 360], [380, 365], [345, 362], [328, 348]].map(P),
  spas: [{ center: P([445, 325]), r: 2.2 }],
  deck: rect([385, 345], 170, 90, 0),
}
const roundabout = { center: P([250, 300]), inner: 5.5, outer: 12 }
const roads = [
  { points: [[250, 0], [250, 288]].map(P), width: 7 },
  { points: [[240, 312], [205, 420], [190, 537]].map(P), width: 7 },
]
const parking = { ...rect([600, 310], 120, 46, 0), stripes: 8 }
const [bx0, by1] = P([0, 0]), [bx1, by0] = P([732, 537])
const bounds = { minX: bx0, maxX: bx1, minY: by0, maxY: by1 }

// Trees: seeded scatter on open ground, clear of buildings, courts, deck, parking, roads and the roundabout.
let seed = 7
const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32)
const inPoly = (pt, poly) => {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}
const grow = (r, m) => ({ ...r, corners: rectCorners(r.center, r.w + 2 * m, r.d + 2 * m, r.angle) })
function rectCorners(center, w, d, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle)
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, y]) => [center[0] + x * cos - y * sin, center[1] + x * sin + y * cos])
}
const segDist = (p, a, b) => {
  const [px, py] = p, [ax, ay] = a, [bx, by] = b, dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}
const lodgeBox = rectCorners([OSM_LODGE[0], OSM_LODGE[1]], Math.max(...xs) - Math.min(...xs) + 6, Math.max(...ys) - Math.min(...ys) + 6, 0)
const keepOut = [lodgeBox, ...blocks.map((b) => grow(b, 3).corners), grow(courts.surround, 2).corners, grow(pool.deck, 1.5).corners, grow(parking, 2).corners]
const trees = [{ x: roundabout.center[0], y: roundabout.center[1], s: 1.2, kind: 'leafy' }]
for (let k = 0; k < 4000 && trees.length < 72; k++) {
  const p = [bounds.minX + rand() * (bounds.maxX - bounds.minX), bounds.minY + rand() * (bounds.maxY - bounds.minY)]
  if (keepOut.some((a) => inPoly(p, a))) continue
  const dr = Math.hypot(p[0] - roundabout.center[0], p[1] - roundabout.center[1])
  if (dr < roundabout.outer + 3) continue
  if (roads.some((r) => r.points.slice(1).some((b, i) => segDist(p, r.points[i], b) < r.width / 2 + 3))) continue
  if (trees.some((t) => Math.hypot(t.x - p[0], t.y - p[1]) < 4.5)) continue
  trees.push({ x: r2(p[0]), y: r2(p[1]), s: r2(0.8 + rand() * 0.5), kind: rand() < 0.6 ? 'pine' : 'leafy' })
}

const roofTop = (h) => r2(h + 3)
const at = (b) => ({ x: b.center[0], y: b.center[1], z: roofTop(b.height), building: b.id })
const byId = Object.fromEntries(blocks.map((b) => [b.id, b]))
const pins = {
  pool: { x: P([380, 342])[0], y: P([380, 342])[1], z: 1.2, building: 'pool' },
  m7: { ...Object.fromEntries([['x', P([335, 240])[0]], ['y', P([335, 240])[1]]]), z: roofTop(lodge.height), building: 'lodge' },
  m6: { ...Object.fromEntries([['x', P([505, 240])[0]], ['y', P([505, 240])[1]]]), z: roofTop(lodge.height), building: 'lodge' },
  m3: at(byId['west-north']),
  m1: at(byId['west-mid']),
  m4: at(byId['west-south']),
  m2: at(byId['south-centre']),
  m5: at(byId['south-east']),
}

const pts = [...lodge.polygon, ...blocks.flatMap((b) => b.corners), ...courts.surround.corners, ...pool.deck.corners]
const frame = { minX: Math.min(...pts.map((p) => p[0])), maxX: Math.max(...pts.map((p) => p[0])), minY: Math.min(...pts.map((p) => p[1])), maxY: Math.max(...pts.map((p) => p[1])) }

writeFileSync('src/data/site.json', JSON.stringify({
  source: 'Invented site plan for the demo (scripts/make-site.mjs). Not a real property.', bounds, frame, lodge, blocks, courts, pool, roundabout, roads, parking, trees, pins,
}, null, 1) + '\n')
console.log(`wrote src/data/site.json: ${blocks.length + 1} buildings, ${trees.length} trees`)
