// AI provider abstraction.
//
// Every AI feature goes through `runTask`, which:
//   1. Sends a structured request (task + system prompt + JSON input + expected schema) to an
//      LLM endpoint when one is configured (VITE_AI_ENDPOINT — a server-side proxy; never put
//      provider API keys in the browser), or
//   2. Falls back to a local mock generator that produces the same structured JSON.
// All outputs are validated and passed through guardrails before reaching the UI.

import { checkGuardrails } from './guardrails'
import { SYSTEM_PROMPTS, type AITask } from './prompts'

export type AISource = 'mock' | 'llm' | 'fallback'

export interface AIResult<T> {
  data: T
  source: AISource
  generatedAt: string
}

export interface AIProviderInfo {
  mode: 'mock' | 'remote'
  endpoint?: string
  label: string
}

const ENDPOINT = (import.meta.env?.VITE_AI_ENDPOINT as string | undefined)?.trim() || undefined

export function getProviderInfo(): AIProviderInfo {
  return ENDPOINT
    ? { mode: 'remote', endpoint: ENDPOINT, label: 'LLM via server endpoint' }
    : { mode: 'mock', label: 'Local mock AI (no API key configured)' }
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

  if (ENDPOINT) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, system: SYSTEM_PROMPTS[task], input, response_format: 'json' }),
      })
      if (!res.ok) throw new Error(`AI endpoint returned ${res.status}`)
      const json: unknown = await res.json()
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
