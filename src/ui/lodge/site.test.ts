import { describe, expect, it } from 'vitest'
import site from '../../data/site.json'
import { METERS } from '../../engine/types'

const inside = (pt: number[], poly: number[][]) => {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

describe('site.json', () => {
  it('has the lodge and the five traced buildings', () => {
    expect(site.lodge.polygon.length).toBeGreaterThan(10)
    expect(site.blocks.map((b) => b.id).sort()).toEqual(['south-centre', 'south-east', 'west-mid', 'west-north', 'west-south'])
  })
  it('places a pin for every meter', () => {
    for (const m of METERS) expect(site.pins[m]).toBeDefined()
  })
  it('keeps trees off buildings, courts and the pool deck', () => {
    const areas = [site.lodge.polygon, ...site.blocks.map((b) => b.corners), site.courts.surround.corners, site.pool.deck.corners]
    expect(site.trees.length).toBeGreaterThanOrEqual(50)
    for (const t of site.trees) for (const a of areas) expect(inside([t.x, t.y], a)).toBe(false)
  })
})
