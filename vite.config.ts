import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'

type Handlers = typeof import('./server/handlers.js')

/** Turns a Node request into a Web Request and writes a Web Response back. */
async function bridge(req: IncomingMessage, res: ServerResponse, handle: (r: Request) => Response | Promise<Response>) {
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  const abort = new AbortController()
  res.on('close', () => { if (!res.writableFinished) abort.abort() })
  const request = new Request(new URL(req.url ?? '/', 'http://localhost'), {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
    signal: abort.signal,
  })
  const response = await handle(request)
  res.statusCode = response.status
  response.headers.forEach((v, k) => res.setHeader(k, v))
  if (response.body) for await (const chunk of response.body) res.write(chunk)
  res.end()
}

/**
 * Serves /api/* during `npm run dev` with the same handlers as production (Vercel functions in
 * /api). Put ANTHROPIC_API_KEY in .env.local to use Claude locally. `vite preview` (used by the
 * browser tests) reports AI as off, so tests never call Claude.
 */
function compPilotApi(): Plugin {
  return {
    name: 'comppilot-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]
        if (!path?.startsWith('/api/')) return next()
        try {
          const h = (await server.ssrLoadModule('/server/handlers.ts')) as Handlers
          if (path === '/api/health') return await bridge(req, res, () => h.health())
          if (path === '/api/task') return await bridge(req, res, (r) => h.task(r))
          if (path === '/api/coach') return await bridge(req, res, (r) => h.coach(r))
          res.statusCode = 404
          res.end()
        } catch (e) {
          next(e)
        }
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/health', (_req, res) => {
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ ai: false }))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Server-only settings from .env files (never exposed to the browser: no VITE_ prefix)
  const env = loadEnv(mode, process.cwd(), '')
  for (const k of ['ANTHROPIC_API_KEY', 'CLAUDE_MODEL', 'ALLOWED_ORIGINS']) if (env[k] && !process.env[k]) process.env[k] = env[k]
  return { plugins: [react(), compPilotApi()] }
})
