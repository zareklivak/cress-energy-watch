import { describe, expect, it } from 'vitest'
import { handleNormalize } from './normalize'

const okRows = { rows: [{ month: '2026-01', m3: 1, m7: 1, m1: 1, m2: 1, pool: 1, m4: 1, m5: 1, m6: 1, total_cuft: 8, rate: 0.06, calc_cost: 0, billed: 0, budget: 1 }], notes: ['Read from page 1.'] }
const reply = (over: object) => async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(okRows) }], ...over })

describe('handleNormalize', () => {
  it('no key gives a plain error', async () => {
    const r = await handleNormalize({ fileName: 'a.csv', kind: 'csv', text: 'x' }, {})
    expect(r.status).toBe(503)
    expect(r.body).toEqual({ error: "The AI reader isn't set up on this server yet." })
  })

  it('rejects a bad request', async () => {
    const r = await handleNormalize({ kind: 'doc' }, { apiKey: 'k', create: reply({}) })
    expect(r.status).toBe(400)
  })

  it('returns rows and notes from the structured output', async () => {
    const r = await handleNormalize({ fileName: 'a.csv', kind: 'csv', text: 'x' }, { apiKey: 'k', create: reply({}) })
    expect(r.status).toBe(200)
    expect(r.body).toEqual(okRows)
  })

  it('refusal and empty results become plain errors', async () => {
    const refused = await handleNormalize({ fileName: 'a.pdf', kind: 'pdf', base64: 'JVBERg==' }, { apiKey: 'k', create: reply({ stop_reason: 'refusal', content: [] }) })
    expect(refused.status).toBe(422)
    const empty = await handleNormalize({ fileName: 'a.csv', kind: 'csv', text: 'x' }, { apiKey: 'k', create: reply({ content: [{ type: 'text', text: '{"rows":[],"notes":[]}' }] }) })
    expect(empty.body).toEqual({ error: "We couldn't find monthly gas readings in this file." })
  })
})

describe('handleNormalize setup errors', () => {
  it('a rejected request reads as a setup problem, not a network one', async () => {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const create = async () => { throw new Anthropic.BadRequestError(400, undefined, 'key not scoped to a workspace', new Headers()) }
    const r = await handleNormalize({ fileName: 'a.csv', kind: 'csv', text: 'x' }, { apiKey: 'k', create })
    expect(r.body).toEqual({ error: "The AI reader isn't set up correctly on this server. Check the API key." })
  })
})
