// Framework-free request handlers (Web Request -> Response). Used by the Vercel functions in
// /api and by the Vite dev server. The browser never sees the API key, the system prompts are
// fixed here, and the coach can only call CompPilot's own three tools, which run in the browser.

import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPTS, type AITask } from '../src/services/ai/prompts.js'
import { COACH_TOOL_SPECS } from '../src/services/ai/agent/toolSpecs.js'
import { ALLOWED_ORIGINS, FALLBACK, LIMITS, MODEL } from './config.js'
import { allow, clientKey } from './rateLimit.js'

/** The part of the Anthropic client the handlers use (so tests can pass a stand-in). */
export type ClaudeClient = Pick<Anthropic, 'beta'>

let shared: ClaudeClient | null = null
const defaultClient = (): ClaudeClient => (shared ??= new Anthropic())

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

const fail = (status: number, error: string, message: string) => json(status, { error, message })

export const hasKey = () => !!process.env.ANTHROPIC_API_KEY?.trim()

function guard(req: Request, bucket: 'coach' | 'task'): Response | null {
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.')
  const origin = req.headers.get('origin')
  if (ALLOWED_ORIGINS.length && (!origin || !ALLOWED_ORIGINS.includes(origin))) return fail(403, 'forbidden', 'Origin not allowed.')
  if (!hasKey()) return fail(503, 'not_configured', 'AI is not configured on this server.')
  const max = bucket === 'coach' ? LIMITS.coachRequests : LIMITS.taskRequests
  if (!allow(`${bucket}:${clientKey(req)}`, max, LIMITS.windowMs)) return fail(429, 'rate_limited', 'Too many requests. Try again in a few minutes.')
  return null
}

async function readBody(req: Request, maxBytes: number): Promise<unknown> {
  const text = await req.text()
  if (text.length > maxBytes) throw new RangeError('too_large')
  return JSON.parse(text)
}

function apiErrorResponse(e: unknown): Response {
  if (e instanceof Anthropic.RateLimitError) return fail(429, 'rate_limited', 'Claude is busy. Try again shortly.')
  if (e instanceof Anthropic.AuthenticationError) return fail(503, 'not_configured', 'The server’s API key was rejected.')
  if (e instanceof Anthropic.BadRequestError) return fail(400, 'bad_request', 'The request could not be processed.')
  if (e instanceof Anthropic.APIError) return fail(502, 'upstream_error', 'Claude returned an error.')
  return fail(500, 'server_error', 'Something went wrong.')
}

const errorCode = (e: unknown) =>
  e instanceof Anthropic.RateLimitError ? 'rate_limited' : e instanceof Anthropic.APIError ? 'upstream_error' : 'server_error'

// ---------------------------------------------------------------------------- health

export function health(): Response {
  return json(200, { ai: hasKey(), model: hasKey() ? MODEL : undefined })
}

// ---------------------------------------------------------------------------- tasks

/** Pulls the JSON object out of a reply, tolerating a code fence or a stray sentence. */
export function parseJsonReply(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(t)
  } catch {
    const start = t.indexOf('{')
    const end = t.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1))
    throw new SyntaxError('no_json')
  }
}

/** One structured AI task (analysis summary, scripts, letter reading, …). Returns { data }. */
export async function task(req: Request, client: ClaudeClient = defaultClient()): Promise<Response> {
  const blocked = guard(req, 'task')
  if (blocked) return blocked
  let body: { task?: unknown; input?: unknown }
  try {
    body = (await readBody(req, LIMITS.taskInputBytes)) as typeof body
  } catch (e) {
    return e instanceof RangeError ? fail(413, 'too_large', 'Input too large.') : fail(400, 'bad_request', 'Invalid JSON.')
  }
  const name = body.task
  if (typeof name !== 'string' || !(name in SYSTEM_PROMPTS)) return fail(400, 'unknown_task', 'Unknown task.')

  try {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16_000,
      ...FALLBACK,
      output_config: { effort: 'medium' },
      system: SYSTEM_PROMPTS[name as AITask],
      messages: [{ role: 'user', content: `Input (JSON):\n${JSON.stringify(body.input ?? {})}\n\nReply with the JSON object only.` }],
    })
    if (res.stop_reason === 'refusal') return fail(422, 'refused', 'Claude declined this request.')
    if (res.stop_reason === 'max_tokens') return fail(502, 'truncated', 'The reply was cut off.')
    const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')
    try {
      return json(200, { data: parseJsonReply(text) })
    } catch {
      return fail(502, 'bad_reply', 'Claude did not return valid JSON.')
    }
  } catch (e) {
    return apiErrorResponse(e)
  }
}

// ---------------------------------------------------------------------------- coach

export const COACH_SYSTEM = `You are CompPilot's negotiation coach, inside the CompPilot app. You only help with evaluating and negotiating the job offer described in the conversation (pay, equity, benefits, timing, how to phrase replies). Politely decline unrelated requests in one sentence.
Use CompPilot's tools for every number you did not get from the situation the user's app sent. Follow the rules the app sends in the first message.`

const COACH_TOOLS = Object.values(COACH_TOOL_SPECS).map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }))

const BLOCK_TYPES = new Set(['text', 'tool_use', 'tool_result', 'thinking', 'redacted_thinking'])

/** Checks the conversation the browser sends: plain roles, known block types, bounded size. */
export function validCoachMessages(v: unknown): v is Anthropic.Beta.BetaMessageParam[] {
  if (!Array.isArray(v) || v.length === 0 || v.length > LIMITS.coachMessages) return false
  if ((v[0] as { role?: unknown })?.role !== 'user') return false
  return v.every((m) => {
    if (typeof m !== 'object' || m === null) return false
    const { role, content } = m as { role?: unknown; content?: unknown }
    if (role !== 'user' && role !== 'assistant') return false
    if (typeof content === 'string') return content.length <= LIMITS.coachTextChars
    return Array.isArray(content) && content.length > 0 && content.every((b) => typeof b === 'object' && b !== null && BLOCK_TYPES.has((b as { type?: string }).type ?? ''))
  })
}

/**
 * One model call for the coach, streamed back as newline-delimited JSON:
 *   {"t":"text","d":"…"}  text as it arrives
 *   {"t":"done","stop_reason":"…","content":[…]}  the full assistant message, to send back
 *                                                  unchanged with tool results
 *   {"t":"error","code":"…","message":"…"}
 * The browser runs any tool calls with CompPilot's calculations and calls again.
 */
export async function coach(req: Request, client: ClaudeClient = defaultClient()): Promise<Response> {
  const blocked = guard(req, 'coach')
  if (blocked) return blocked
  let body: { messages?: unknown }
  try {
    body = (await readBody(req, LIMITS.coachBodyBytes)) as typeof body
  } catch (e) {
    return e instanceof RangeError ? fail(413, 'too_large', 'Conversation too long. Start a new conversation.') : fail(400, 'bad_request', 'Invalid JSON.')
  }
  if (!validCoachMessages(body.messages)) return fail(400, 'bad_request', 'Invalid conversation.')
  const messages = body.messages

  const enc = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + '\n'))
      try {
        // Tool inputs are a few small numbers, so they are not streamed (no eager_input_streaming);
        // only the final message's tool calls are used.
        const s = client.beta.messages.stream(
          {
            model: MODEL,
            max_tokens: 8_000,
            ...FALLBACK,
            output_config: { effort: 'low' },
            system: COACH_SYSTEM,
            tools: COACH_TOOLS,
            messages,
          },
          { signal: req.signal },
        )
        for await (const ev of s) {
          if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') send({ t: 'text', d: ev.delta.text })
        }
        const final = await s.finalMessage()
        send({ t: 'done', stop_reason: final.stop_reason, content: final.content })
      } catch (e) {
        if (!req.signal.aborted) send({ t: 'error', code: errorCode(e), message: 'Claude returned an error.' })
      } finally {
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' } })
}
