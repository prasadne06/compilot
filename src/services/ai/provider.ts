// AI provider abstraction.
//
// Every structured AI feature goes through `runTask`, which:
//   1. Sends { task, input } to CompPilot's AI server when one is running (see /server). The
//      server holds the API key and the system prompts; the browser never sees either.
//   2. Otherwise uses a local generator that produces the same JSON shape.
// All outputs are shape-checked and passed through guardrails; anything invalid falls back
// to the local generator.

import { checkGuardrails } from './guardrails'
import type { AITask } from './prompts'
import { getAIServer } from './server'

export type AISource = 'mock' | 'llm' | 'fallback'

export interface AIResult<T> {
  data: T
  source: AISource
  generatedAt: string
}

export interface AIProviderInfo {
  mode: 'mock' | 'remote'
  model?: string
  label: string
}

export async function getProviderInfo(): Promise<AIProviderInfo> {
  const server = await getAIServer()
  return server
    ? { mode: 'remote', model: server.model, label: 'Claude, through CompPilot’s server' }
    : { mode: 'mock', label: 'Built-in rules and templates (no AI server)' }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface RunOptions<T> {
  /** Deterministic local generator with the same output shape. */
  mock: () => T
  /** Shape check for LLM output. */
  validate: (value: unknown) => value is T
  /** Simulated latency for mock responses so loading states are exercised. */
  latencyMs?: number
}

export async function runTask<T>(task: AITask, input: unknown, opts: RunOptions<T>): Promise<AIResult<T>> {
  const now = () => new Date().toISOString()

  const server = await getAIServer()
  if (server) {
    try {
      const res = await fetch(`${server.base}/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, input }),
      })
      if (!res.ok) throw new Error(`AI server returned ${res.status}`)
      const json = ((await res.json()) as { data?: unknown }).data
      if (!opts.validate(json)) throw new Error('AI response did not match the expected schema')
      const violations = checkGuardrails(json)
      if (violations.length) throw new Error(`AI response failed guardrails: ${violations.join(', ')}`)
      return { data: json, source: 'llm', generatedAt: now() }
    } catch (err) {
      console.warn(`[ai:${task}] falling back to mock`, err)
      return { data: opts.mock(), source: 'fallback', generatedAt: now() }
    }
  }

  await sleep(opts.latencyMs ?? 700)
  return { data: opts.mock(), source: 'mock', generatedAt: now() }
}

// Small shape helpers for validators
export const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
export const isStr = (v: unknown): v is string => typeof v === 'string'
export const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr)
