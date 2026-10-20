import type { PinTone } from './pins'

/**
 * One palette for the site map, shared by the 3D view (three.js needs literal hex) and the flat SVG plan.
 * UI colors (accent, flags, ink) stay in the design tokens in index.css; these are landscape and building colors only.
 */
export const SITE_COLORS = {
  sky: '#e4ece7',
  grass: '#c6d7b0',
  road: '#a3aaa5',
  drive: '#bcc1bb',
  deck: '#ece5d4',
  water: '#6fbfd3',
  spa: '#8fd0de',
  courtSurround: '#7ea477',
  court: '#4f86bd',
  line: '#ffffff',
  wall: '#ece5d4',
  plan: '#f6f3ec',
  band: '#8f9ea4',
  base: '#cfc3ad',
  roof: '#5c6264',
  pine: '#4d7a56',
  leaf: '#86ad6b',
  trunk: '#7a5b3e',
  island: '#a8c58b',
  stripe: '#f2f2ee',
  net: '#2f3a3a',
} as const

/** Soft wall tint for a building that holds this month's flag. */
export const WALL_TINT: Partial<Record<PinTone, string>> = { high: '#f0cfc4', medium: '#f1e0bd' }
