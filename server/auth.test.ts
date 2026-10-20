import { describe, expect, it } from 'vitest'
import { isAuthorized } from './auth'

const basic = (user: string, pass: string) => `Basic ${btoa(`${user}:${pass}`)}`

describe('isAuthorized', () => {
  it('accepts the right password with any user name', () => {
    expect(isAuthorized(basic('guest', 'demo-pass'), 'demo-pass')).toBe(true)
    expect(isAuthorized(basic('', 'demo-pass'), 'demo-pass')).toBe(true)
  })
  it('rejects a wrong or missing password', () => {
    expect(isAuthorized(basic('guest', 'nope'), 'demo-pass')).toBe(false)
    expect(isAuthorized(null, 'demo-pass')).toBe(false)
    expect(isAuthorized('Bearer x', 'demo-pass')).toBe(false)
  })
  it('locks everything when no password is configured', () => {
    expect(isAuthorized(basic('guest', ''), undefined)).toBe(false)
    expect(isAuthorized(basic('guest', ''), '')).toBe(false)
  })
})
