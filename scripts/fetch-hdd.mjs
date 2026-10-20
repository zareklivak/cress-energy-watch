// Prints Truckee HDD65 for the season and a 10-year monthly normal from the
// Open-Meteo archive, so src/data/truckee-hdd.json can be re-checked.
const LAT = 39.328
const LON = -120.1833

async function daily(start, end) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${start}&end_date=${end}&daily=temperature_2m_mean&temperature_unit=fahrenheit&timezone=America%2FLos_Angeles`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
  const { daily: d } = await res.json()
  return d.time.map((t, i) => [t, d.temperature_2m_mean[i]])
}

const season = {}
for (const [t, temp] of await daily('2025-12-01', '2026-08-31')) {
  if (temp == null) continue
  season[t.slice(0, 7)] = (season[t.slice(0, 7)] ?? 0) + Math.max(0, 65 - temp)
}
const sums = {}
const years = {}
for (const [t, temp] of await daily('2016-01-01', '2025-12-31')) {
  if (temp == null) continue
  const m = t.slice(5, 7)
  sums[m] = (sums[m] ?? 0) + Math.max(0, 65 - temp)
  ;(years[m] ??= new Set()).add(t.slice(0, 4))
}
const round = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)]))
const normal = Object.fromEntries(Object.keys(sums).sort().map((m) => [m, Math.round(sums[m] / years[m].size)]))
console.log(JSON.stringify({ season: round(season), normal }, null, 2))
