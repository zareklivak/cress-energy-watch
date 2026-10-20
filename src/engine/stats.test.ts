import { describe, expect, it } from 'vitest'
import { mad, median, robustZ } from './stats'
import { inSentence, joinList, mult, numK, usd, usdK } from './format'

describe('stats', () => {
  it('median handles odd, even and empty input without mutating it', () => {
    const xs = [5, 1, 3]
    expect(median(xs)).toBe(3)
    expect(xs).toEqual([5, 1, 3])
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(median([])).toBe(0)
  })
  it('robust z of the sample pool series flags the April-May leak', () => {
    const pool = [89579, 90970, 5713, 78922, 368962, 491533, 60802, 55513, 55513]
    expect(mad(pool)).toBe(23409)
    expect(robustZ(pool)[4]).toBeCloseTo(8.36, 2)
    expect(robustZ(pool)[5]).toBeCloseTo(11.89, 2)
  })
  it('robust z is all zeros when the spread is zero', () => {
    expect(robustZ([7, 7, 7, 9])).toEqual([0, 0, 0, 0])
  })
})

describe('format', () => {
  it('formats dollars and multiples the way headlines need', () => {
    expect(usd(54063)).toBe('$54,063')
    expect(usd(-262)).toBe('-$262')
    expect(usdK(48210)).toBe('$48.2K')
    expect(mult(2.134)).toBe('2.1×')
    expect(mult(4.33)).toBe('4×')
  })
  it('shortens millions of cubic feet', () => {
    expect(numK(1_261_000)).toBe('1.26M')
    expect(numK(78_146)).toBe('78K')
  })
  it('never prints Infinity or NaN as a multiple', () => {
    expect(mult(Infinity)).toBe('—')
    expect(mult(NaN)).toBe('—')
  })
  it('joins lists and puts labels mid-sentence without breaking acronyms', () => {
    expect(joinList(['A'])).toBe('A')
    expect(joinList(['A', 'B', 'C'])).toBe('A, B and C')
    expect(inSentence('Meter 7')).toBe('meter 7')
    expect(inSentence('Pool & spa')).toBe('pool & spa')
    expect(inSentence('HVAC Boiler')).toBe('HVAC boiler')
  })
})
