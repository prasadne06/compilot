// Access to Claude through the claude.ai artifact runtime's `sample` capability.
// Available only when the app runs inside a Claude artifact viewer; everywhere else
// this resolves null and the offline coach is used.

export interface SampleTool {
  name: string
  description: string
  inputSchema?: { type: 'object'; properties?: Record<string, unknown>; required?: string[] }
  execute: (input: Record<string, unknown>, context: { signal: AbortSignal }) => unknown
}

export interface SampleError {
  code: string
  message: string
  text?: string
}

export type SampleFn = ((
  input: string | { role: 'user' | 'assistant'; content: string }[],
  options?: { onText?: (u: { text: string; delta: string }) => void; signal?: AbortSignal; tools?: SampleTool[]; modelTier?: 'quick' | 'default' | 'complex'; cache?: boolean },
) => Promise<{ text: string; truncated: boolean }>) & { limits?: () => Promise<{ tools?: { maxCount: number } }> }

declare global {
  interface Window {
    claude?: { use: (name: string) => Promise<unknown> }
  }
}

let pending: Promise<SampleFn | null> | null = null

/** Resolves Claude's sample function when this view can call Claude with tools, else null. */
export function getClaude(): Promise<SampleFn | null> {
  if (!pending)
    pending = (async () => {
      if (typeof window === 'undefined' || !window.claude?.use) return null
      try {
        const sample = (await window.claude.use('sample')) as SampleFn | null
        if (!sample) return null
        const limits = await sample.limits?.().catch(() => null)
        if (limits && !limits.tools) return null
        return sample
      } catch {
        return null
      }
    })()
  return pending
}

/** Codes after which Claude can't be used for the rest of this view. */
export const PERMANENT_CODES = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed', 'tools_unavailable']

export function isSampleError(e: unknown): e is SampleError {
  return typeof e === 'object' && e !== null && 'code' in e && typeof (e as SampleError).code === 'string'
}

export function sampleErrorCopy(code: string): string {
  switch (code) {
    case 'rate_limited': return 'Claude is busy or your usage limit was reached. Try again in a little while.'
    case 'session_expired': return 'Your Claude session expired. Sign in again, then retry.'
    case 'refused': return 'Claude couldn’t answer that. Try rephrasing.'
    case 'prompt_too_large': return 'The conversation got too long. Start a new conversation.'
    case 'empty_completion': return 'Claude didn’t return an answer. Try rephrasing.'
    default: return 'Something went wrong reaching Claude. Try again.'
  }
}
