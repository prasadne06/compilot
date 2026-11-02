// Server settings. The API key is read by the Anthropic SDK from ANTHROPIC_API_KEY and never
// leaves the server.

export const MODEL = process.env.CLAUDE_MODEL?.trim() || 'claude-opus-5-5'

/** Re-runs a refused request on a suitable model chosen by the API (Claude API only). */
export const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }

export const LIMITS = {
  /** Requests per client IP per window, per server instance (best effort on serverless). */
  windowMs: 10 * 60_000,
  coachRequests: 60, // one coach reply can take a few requests when tools run
  taskRequests: 40,
  taskInputBytes: 40_000,
  coachBodyBytes: 150_000,
  coachMessages: 60,
  coachTextChars: 12_000,
}

/** Comma-separated origins allowed to call the API, e.g. "https://comppilot.app". Unset = any. */
export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
