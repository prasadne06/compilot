// Finds CompPilot's own AI server (see /server). When the app is deployed with an
// ANTHROPIC_API_KEY on the server, AI features use Claude automatically; otherwise the app
// uses its built-in rules and templates. Set VITE_AI_SERVER=off to never look for a server.

const BASE = ((import.meta.env?.VITE_AI_SERVER as string | undefined)?.trim() || '/api').replace(/\/$/, '')

export interface AIServer {
  base: string
  model?: string
}

let pending: Promise<AIServer | null> | null = null

export function getAIServer(): Promise<AIServer | null> {
  if (BASE === 'off') return Promise.resolve(null)
  if (!pending)
    pending = (async () => {
      try {
        const res = await fetch(`${BASE}/health`, { headers: { accept: 'application/json' } })
        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return null
        const body = (await res.json()) as { ai?: boolean; model?: string }
        return body.ai ? { base: BASE, model: body.model } : null
      } catch {
        return null
      }
    })()
  return pending
}

/** For tests. */
export function resetAIServer() {
  pending = null
}
