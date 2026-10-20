import { handleNormalize } from '../server/normalize.js'

/** Vercel function. ANTHROPIC_API_KEY comes from the project's environment settings. */
export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null)
  const result = await handleNormalize(body, { apiKey: process.env.ANTHROPIC_API_KEY })
  return Response.json(result.body, { status: result.status })
}
