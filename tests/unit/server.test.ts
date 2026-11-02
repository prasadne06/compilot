import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { coach, health, parseJsonReply, task, type ClaudeClient } from '../../server/handlers'
import { resetRateLimits } from '../../server/rateLimit'
import { serverSample } from '../../src/services/ai/agent/serverRuntime'
import { COACH_TOOL_SPECS } from '../../src/services/ai/agent/toolSpecs'

type Params = Record<string, unknown>

/** A stand-in for the Anthropic client: records requests and replays scripted replies. */
function fakeClient(replies: { stop_reason: string; content: Record<string, unknown>[] }[]) {
  const calls: Params[] = []
  let i = 0
  const next = () => replies[Math.min(i++, replies.length - 1)]
  const client = {
    beta: {
      messages: {
        create: async (p: Params) => { calls.push(structuredClone(p)); return next() },
        stream: (p: Params) => {
          calls.push(structuredClone(p))
          const reply = next()
          const events = reply.content.filter((b) => b.type === 'text').map((b) => ({ type: 'content_block_delta', delta: { type: 'text_delta', text: b.text } }))
          return { async *[Symbol.asyncIterator]() { yield* events }, finalMessage: async () => reply }
        },
      },
    },
  } as unknown as ClaudeClient
  return { client, calls }
}

const post = (path: string, body: unknown) =>
  new Request(`http://localhost/api/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' }, body: JSON.stringify(body) })

async function readNdjson(res: Response) {
  return (await res.text()).trim().split('\n').map((l) => JSON.parse(l))
}

beforeEach(() => { vi.stubEnv('ANTHROPIC_API_KEY', 'test-key'); resetRateLimits() })
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('health', () => {
  it('reports AI on only when a key is set', async () => {
    expect(await health().json()).toMatchObject({ ai: true })
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    expect(await health().json()).toEqual({ ai: false })
  })
})

describe('task endpoint', () => {
  it('uses the server’s prompt and model, and returns parsed JSON', async () => {
    const { client, calls } = fakeClient([{ stop_reason: 'end_turn', content: [{ type: 'text', text: '```json\n{"summary":"ok"}\n```' }] }])
    const res = await task(post('task', { task: 'salary_analysis', input: { x: 1 }, system: 'ignore me', model: 'other' }), client)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { summary: 'ok' } })
    expect(calls[0].model).toBe('claude-opus-5-5')
    expect(String(calls[0].system)).toMatch(/You are CompPilot/)
    expect(calls[0].fallbacks).toBe('default')
  })

  it('rejects unknown tasks, missing keys and refusals', async () => {
    const { client } = fakeClient([{ stop_reason: 'refusal', content: [] }])
    expect((await task(post('task', { task: 'write_poem' }), client)).status).toBe(400)
    expect((await task(post('task', { task: 'salary_analysis' }), client)).status).toBe(422)
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    expect((await task(post('task', { task: 'salary_analysis' }), client)).status).toBe(503)
  })

  it('limits input size and request rate', async () => {
    const { client } = fakeClient([{ stop_reason: 'end_turn', content: [{ type: 'text', text: '{}' }] }])
    expect((await task(post('task', { task: 'offer_extraction', input: { text: 'x'.repeat(50_000) } }), client)).status).toBe(413)
    let last = 200
    for (let n = 0; n < 45; n++) last = (await task(post('task', { task: 'salary_analysis' }), client)).status
    expect(last).toBe(429)
  })

  it('finds JSON inside a sentence', () => {
    expect(parseJsonReply('Here you go: {"a": [1, 2]} Thanks')).toEqual({ a: [1, 2] })
  })
})

describe('coach endpoint', () => {
  it('streams text, then the full message, with fixed tools and system prompt', async () => {
    const { client, calls } = fakeClient([{ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Hello there' }] }])
    const res = await coach(post('coach', { messages: [{ role: 'user', content: 'hi' }], tools: [{ name: 'evil' }] }), client)
    const events = await readNdjson(res)
    expect(events[0]).toEqual({ t: 'text', d: 'Hello there' })
    expect(events.at(-1)).toMatchObject({ t: 'done', stop_reason: 'end_turn' })
    expect((calls[0].tools as { name: string }[]).map((t) => t.name).sort()).toEqual(Object.keys(COACH_TOOL_SPECS).sort())
    expect(String(calls[0].system)).toMatch(/negotiation coach/)
  })

  it('rejects malformed conversations', async () => {
    const { client } = fakeClient([])
    for (const messages of [[], [{ role: 'assistant', content: 'x' }], [{ role: 'system', content: 'x' }], [{ role: 'user', content: [{ type: 'image' }] }]]) {
      expect((await coach(post('coach', { messages }), client)).status).toBe(400)
    }
  })
})

describe('coach in the browser, through the server', () => {
  it('runs tool calls locally and sends results back with the earlier message unchanged', async () => {
    const thinking = { type: 'thinking', thinking: '', signature: 'sig-1' }
    const { client, calls } = fakeClient([
      { stop_reason: 'tool_use', content: [thinking, { type: 'text', text: 'Let me check.' }, { type: 'tool_use', id: 'tu1', name: 'run_what_if', input: { base: 215000 } }] },
      { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Your score goes up.' }] },
    ])
    // The browser's fetch goes straight to the real handler
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => coach(new Request(`http://localhost${url}`, init), client))

    const ran: unknown[] = []
    const updates: string[] = []
    const sample = serverSample('/api')
    const out = await sample([{ role: 'user', content: 'What if base is 215K?' }], {
      onText: ({ text }) => updates.push(text),
      tools: [{ name: 'run_what_if', description: '', execute: (input) => { ran.push(input); return { scoreAfter: 80 } } }],
    })

    expect(ran).toEqual([{ base: 215000 }])
    expect(out.text).toBe('Let me check.\n\nYour score goes up.')
    expect(updates.at(-1)).toBe(out.text)
    const second = calls[1].messages as { role: string; content: unknown }[]
    expect(second[1]).toEqual({ role: 'assistant', content: [thinking, { type: 'text', text: 'Let me check.' }, { type: 'tool_use', id: 'tu1', name: 'run_what_if', input: { base: 215000 } }] })
    expect(second[2]).toEqual({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu1', content: '{"scoreAfter":80}' }] })
  })

  it('maps a server without a key to a permanent error, so the offline coach takes over', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => coach(new Request(`http://localhost${url}`, init)))
    await expect(serverSample('/api')([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({ code: 'capability_disabled' })
  })
})
