import { next } from '@vercel/functions/middleware'
import { isAuthorized } from './server/auth.js'

/** Vercel Routing Middleware: every page, asset and /api call needs the demo password. */
export default function middleware(request: Request): Response {
  if (isAuthorized(request.headers.get('authorization'), process.env.DEMO_PASSWORD)) return next()
  return new Response('This demo is password protected.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Cress Energy Watch demo", charset="UTF-8"', 'X-Robots-Tag': 'noindex, nofollow' },
  })
}

export const config = { matcher: '/:path*' }
