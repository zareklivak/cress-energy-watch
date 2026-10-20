import Anthropic from '@anthropic-ai/sdk'
import { NORMALIZED_SCHEMA, type NormalizedResult } from '../src/engine/normalized.js'

export const MAX_UPLOAD_BYTES = 3_000_000

export type NormalizeRequest = { fileName: string; kind: 'csv' | 'pdf'; text?: string; base64?: string }
export type HandlerResult = { status: number; body: NormalizedResult | { error: string } }
type Reply = { stop_reason: string | null; content: { type: string; text?: string }[] }
export type CreateFn = (params: Record<string, unknown>) => Promise<Reply>

const SYSTEM = `You read a resort property's gas utility records and return them as a monthly table.
The property has eight gas meters with these ids: m3, m7, m1, m2, pool, m4, m5, m6. Map whatever names the file uses (for example "Meter 3", "Pool heater") to those ids. Use 0 for a meter with no reading that month.
For each month: month as YYYY-MM, each meter's usage in cubic feet, total_cuft (the sum), rate in dollars per cubic foot, calc_cost (total_cuft x rate, rounded to whole dollars), billed (the amount the bill actually charged, whole dollars; use calc_cost if not shown) and budget (whole dollars; use 0 if the file has no budget).
Never invent readings. If a month is unreadable, leave it out and say so in notes. Notes are short, plain-English sentences for a property manager, at most five.`

function bad(status: number, error: string): HandlerResult {
  return { status, body: { error } }
}

function isRequest(x: unknown): x is NormalizeRequest {
  const r = x as NormalizeRequest
  return !!r && typeof r.fileName === 'string' && (r.kind === 'csv' ? typeof r.text === 'string' : r.kind === 'pdf' && typeof r.base64 === 'string')
}

export async function handleNormalize(input: unknown, deps: { apiKey?: string; create?: CreateFn }): Promise<HandlerResult> {
  if (!deps.apiKey && !deps.create) return bad(503, "The AI reader isn't set up on this server yet.")
  if (!isRequest(input)) return bad(400, "That upload didn't come through. Try choosing the file again.")
  const size = input.kind === 'csv' ? input.text!.length : (input.base64!.length * 3) / 4
  if (size > MAX_UPLOAD_BYTES) return bad(413, 'That file is over 3 MB. Try a smaller export or one month per PDF.')

  const create: CreateFn = deps.create ?? ((params) => new Anthropic({ apiKey: deps.apiKey }).beta.messages.create(params as never) as unknown as Promise<Reply>)
  const fileBlock = input.kind === 'pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: input.base64 } }
    : { type: 'text', text: `File "${input.fileName}":\n\n${input.text}` }
  let reply: Reply
  try {
    reply = await create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: NORMALIZED_SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: 'Return this property\'s monthly gas table.' }] }],
    })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return bad(503, "The AI reader isn't set up on this server yet.")
    if (e instanceof Anthropic.RateLimitError) return bad(503, 'The AI reader is busy. Try again in a minute.')
    if (e instanceof Anthropic.BadRequestError || e instanceof Anthropic.PermissionDeniedError) {
      return bad(503, "The AI reader isn't set up correctly on this server. Check the API key.")
    }
    return bad(502, "The AI reader couldn't be reached. Try again in a minute.")
  }
  if (reply.stop_reason === 'refusal') return bad(422, "The AI reader couldn't read this file. Try a different export.")
  if (reply.stop_reason === 'max_tokens') return bad(422, 'That file is too long to read in one go. Try a shorter range of months.')
  const text = reply.content.find((b) => b.type === 'text')?.text
  let parsed: NormalizedResult
  try {
    parsed = JSON.parse(text ?? '') as NormalizedResult
  } catch {
    return bad(422, "We couldn't find monthly gas readings in this file.")
  }
  if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) return bad(422, "We couldn't find monthly gas readings in this file.")
  return { status: 200, body: { rows: parsed.rows, notes: Array.isArray(parsed.notes) ? parsed.notes.slice(0, 5) : [] } }
}
