import { describe, expect, it } from 'vitest'
import { compose } from '../engine/compose'
import { SAMPLE_ROWS, SEASON_HDD } from '../engine/sample'
import { groupFlags } from './actions'

const open = compose(SAMPLE_ROWS, SEASON_HDD).filter((f) => f.status === 'new' || f.status === 'reviewing')

describe('groupFlags', () => {
  const g = groupFlags(open)
  it('puts every open flag in exactly one action group', () => {
    expect(g.inspect.flags.length + g.utility.flags.length + g.budget.flags.length).toBe(open.length)
  })
  it('groups by what the manager does next', () => {
    expect(g.inspect.flags.map((f) => f.kind).sort()).toEqual(['dominant-meter', 'over-budget'])
    expect(g.utility.flags.map((f) => f.kind).sort()).toEqual(['cost-mismatch', 'drop-out', 'entry-error', 'estimated-reads', 'repeat-month'])
    expect(g.budget.flags.map((f) => f.kind)).toEqual(['budget-shape'])
  })
  it('counts only money at stake, not season totals or underspend', () => {
    const over = open.find((f) => f.kind === 'over-budget')!
    expect(g.inspect.atStake).toBe(over.impactUsd)
    expect(g.budget.atStake).toBe(0)
    expect(g.utility.atStake).toBe(g.utility.flags.reduce((a, f) => a + (f.impactUsd ?? 0), 0))
  })
})
