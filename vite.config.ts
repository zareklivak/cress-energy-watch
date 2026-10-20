/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/** Serves POST /api/normalize in `vite dev` with the same handler Vercel runs. The key stays server-side. */
function normalizeApi(): Plugin {
  return {
    name: 'normalize-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      server.middlewares.use('/api/normalize', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        let body: unknown = null
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { /* handled as a bad request */ }
        const mod = (await server.ssrLoadModule('/server/normalize.ts')) as typeof import('./server/normalize')
        const result = await mod.handleNormalize(body, { apiKey: env.ANTHROPIC_API_KEY })
        res.statusCode = result.status
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(result.body))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), normalizeApi()],
  test: { include: ['src/**/*.test.ts', 'server/**/*.test.ts'] },
})
