// Claude through CompPilot's own server (see /server/handlers.ts → coach). Same shape as the
// artifact runtime's `sample`, so the coach code doesn't care which one it gets.
// The server makes one model call per request; tool calls come back here and run in the
// browser with CompPilot's calculations, then the conversation goes back with the results.

import type { SampleError, SampleFn } from './claudeRuntime'

const MAX_STEPS = 6

type Block = { type: string; id?: string; name?: string; input?: unknown; [k: string]: unknown }
type Wire = { role: 'user' | 'assistant'; content: string | Block[] }

const sampleError = (code: string, message: string, text?: string): SampleError => ({ code, message, text })

function codeFor(status: number, error?: string): string {
  if (status === 429) return 'rate_limited'
  if (status === 413) return 'prompt_too_large'
  if (status === 422) return 'refused'
  // The server has no key or doesn't allow this site: use the offline coach for this visit
  if (status === 503 || status === 403 || error === 'not_configured') return 'capability_disabled'
  return 'upstream_error'
}

export function serverSample(base: string): SampleFn {
  const sample: SampleFn = async (input, options = {}) => {
    const { signal, onText, tools = [] } = options
    const messages: Wire[] = typeof input === 'string' ? [{ role: 'user', content: input }] : input.map((m) => ({ role: m.role, content: m.content }))
    let all = ''

    for (let step = 0; step < MAX_STEPS; step++) {
      let res: Response
      try {
        res = await fetch(`${base}/coach`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages }), signal })
      } catch {
        throw signal?.aborted ? sampleError('cancelled', 'Stopped', all) : sampleError('upstream_error', 'Network error', all)
      }
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
        throw sampleError(codeFor(res.status, body.error), body.message ?? 'Request failed', all)
      }

      const prefix = all ? `${all}\n\n` : ''
      let stepText = ''
      let done: { stop_reason: string; content: Block[] } | undefined
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
      let buf = ''
      try {
        for (;;) {
          const { value, done: end } = await reader.read()
          if (end) break
          buf += value
          let nl: number
          while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl).trim()
            buf = buf.slice(nl + 1)
            if (!line) continue
            const ev = JSON.parse(line) as { t: string; d?: string; code?: string; message?: string; stop_reason?: string; content?: Block[] }
            if (ev.t === 'text' && ev.d) {
              stepText += ev.d
              onText?.({ text: prefix + stepText, delta: ev.d })
            } else if (ev.t === 'done') {
              done = { stop_reason: ev.stop_reason ?? 'end_turn', content: ev.content ?? [] }
            } else if (ev.t === 'error') {
              throw sampleError(ev.code ?? 'upstream_error', ev.message ?? 'Claude returned an error.', prefix + stepText)
            }
          }
        }
      } catch (e) {
        if (signal?.aborted) throw sampleError('cancelled', 'Stopped', prefix + stepText)
        throw e && typeof e === 'object' && 'code' in e ? e : sampleError('upstream_error', 'Bad response', prefix + stepText)
      }

      if (stepText) all = prefix + stepText
      if (!done) throw sampleError('upstream_error', 'The reply ended early.', all)
      if (done.stop_reason === 'refusal') throw sampleError('refused', 'Claude declined.', all)
      // Sent back unchanged (including thinking blocks) so the conversation stays valid
      messages.push({ role: 'assistant', content: done.content })
      if (done.stop_reason !== 'tool_use') {
        if (!all) throw sampleError('empty_completion', 'No answer', all)
        return { text: all, truncated: done.stop_reason === 'max_tokens' }
      }

      const results: Block[] = []
      for (const call of done.content.filter((b) => b.type === 'tool_use')) {
        const tool = tools.find((t) => t.name === call.name)
        try {
          if (!tool) throw new Error(`Unknown tool ${call.name}`)
          const out = await tool.execute((call.input ?? {}) as Record<string, unknown>, { signal: signal ?? new AbortController().signal })
          results.push({ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(out) })
        } catch (e) {
          results.push({ type: 'tool_result', tool_use_id: call.id, content: e instanceof Error ? e.message : 'Tool failed', is_error: true })
        }
      }
      messages.push({ role: 'user', content: results })
    }
    throw sampleError('upstream_error', 'Too many steps', all)
  }
  return sample
}
