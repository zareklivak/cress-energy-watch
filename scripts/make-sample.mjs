// Generates the demo's sample gas sheet from scratch: invented meter sizes, a heating-degree-day
// usage model and seeded noise, then the eight "stories" the demo is built to catch, injected on
// purpose. No real property's numbers go in.
// Usage: node scripts/make-sample.mjs [seed]
import { readFileSync, writeFileSync } from 'node:fs'

const SEED = Number(process.argv[2] ?? 11)
let s = SEED >>> 0
const rand = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32)
const noise = (pct) => 1 + (rand() * 2 - 1) * pct

const MONTHS = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08']
const METERS = ['m3', 'm7', 'm1', 'm2', 'pool', 'm4', 'm5', 'm6']
const hdd = JSON.parse(readFileSync('src/data/truckee-hdd.json', 'utf8')).season
const PEAK_HDD = 900

// Invented meter sizes (cu ft in a typical heating month) and how much of each is heating load.
const METER = {
  m3: { size: 31000, heat: 0.7 },
  m7: { size: 68000, heat: 1.0 }, // heating-only boiler loop: off for the summer
  m1: { size: 42000, heat: 0.75 },
  m2: { size: 61000, heat: 0.7 },
  pool: { size: 88000, heat: 0.35 },
  m4: { size: 9500, heat: 0.6 },
  m5: { size: 19000, heat: 0.65 },
  m6: { size: 15500, heat: 0.7 },
}
const model = (m, month) => {
  const { size, heat } = METER[m]
  return size * ((1 - heat) + heat * Math.min(1.2, hdd[month] / PEAK_HDD)) * noise(0.08)
}

const use = MONTHS.map((month) => Object.fromEntries(METERS.map((m) => [m, model(m, month)])))
const at = (month) => MONTHS.indexOf(month)
const round = (n) => Math.round(n)

// 1. Drop-outs: one low read each on m1 (Dec) and m3 (Jan).
use[at('2025-12')].m1 *= 0.11
use[at('2026-01')].m3 *= 0.08
// 2. Estimated February: five meters read far too low, two of them the same number...
const feb = use[at('2026-02')]
for (const m of ['m1', 'pool', 'm4']) feb[m] *= 0.07
feb.m2 = feb.m6 = 3180
// ...and two of them catch up in March.
use[at('2026-03')].m2 = use[at('2026-01')].m2 * 1.85
use[at('2026-03')].m4 = use[at('2026-01')].m4 * 4.6
// 3. Pool leak: April and May run several times normal.
use[at('2026-04')].pool *= 4.9
use[at('2026-05')].pool *= 6.6
// 4. Seasonal shutdown: m7 off from June.
use[at('2026-06')].m7 = 1100
use[at('2026-07')].m7 = 0
use[at('2026-08')].m7 = 0
// 5. Repeat month: August copied from July for every meter except m1 (and m7, which is zero).
for (const m of METERS) if (m !== 'm1' && m !== 'm7') use[at('2026-08')][m] = use[at('2026-07')][m]
// 6. Entry error: m1's June value shows up again in August (set below via the cost column).
use[at('2026-08')].m1 = use[at('2026-06')].m1

const rows = use.map((u) => Object.fromEntries(METERS.map((m) => [m, round(u[m])])))
// Snap repeats/shared values after rounding so they stay identical.
for (const m of METERS) if (m !== 'm1' && m !== 'm7') rows[at('2026-08')][m] = rows[at('2026-07')][m]
rows[at('2026-08')].m1 = rows[at('2026-06')].m1

// Invented utility rates ($ per cu ft), drifting through the season.
const RATES = [0.0884, 0.0931, 0.0897, 0.0852, 0.0819, 0.0843, 0.0838, 0.0846, 0.0846]

// Budget: a plan that ignores both the season and the leak. Jan and Feb share one number,
// March and May drop while actual cost rises.
const BUDGET = [26500, 41800, 41800, 33900, 34800, 22500, 12800, 11600, 11900]

const out = rows.map((r, i) => {
  const total = METERS.reduce((a, m) => a + r[m], 0)
  const rate = RATES[i]
  const calc = round(total * rate)
  let alt = calc
  // 7. Cost mismatch: Dec and Jan's second cost column is off by amounts no single meter explains.
  if (MONTHS[i] === '2025-12') alt = calc - 287
  if (MONTHS[i] === '2026-01') alt = calc - 763
  // 6 (cont.). July's second cost column was computed with m1's June reading.
  if (MONTHS[i] === '2026-07') alt = round((total - r.m1 + rows[at('2026-06')].m1) * rate)
  return { month: MONTHS[i], ...r, total_cuft: total, rate, calc_cost: calc, alt_cost: alt, budget: BUDGET[i] }
})

const cols = ['month', ...METERS, 'total_cuft', 'rate', 'calc_cost', 'alt_cost', 'budget']
writeFileSync('src/data/sample-gas.csv', [cols.join(','), ...out.map((r) => cols.map((c) => r[c]).join(','))].join('\n') + '\n')
console.log(`wrote src/data/sample-gas.csv with seed ${SEED}`)
