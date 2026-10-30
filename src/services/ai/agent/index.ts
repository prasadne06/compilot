import { checkConversationalText } from '../guardrails'
import { getClaude, isSampleError, PERMANENT_CODES, sampleErrorCopy, type SampleFn } from './claudeRuntime'
import { runOfflineCoach } from './offlineCoach'
import { buildCoachInstructions } from './prompt'
import { COACH_TOOLS } from './tools'
import type { CoachCallbacks, CoachEngine, CoachMessage, CoachWorkspace } from './types'

export * from './types'
export { getClaude } from './claudeRuntime'
export { parseTerms } from './offlineCoach'

const HISTORY_TURNS = 14

export class CoachError extends Error {
  readonly code: string
  readonly permanent: boolean
  readonly partial?: string
  constructor(message: string, code: string, permanent: boolean, partial?: string) {
    super(message)
    this.code = code
    this.permanent = permanent
    this.partial = partial
  }
}

const SAFE_REPLACEMENT =
  'I started to write something that doesn’t meet CompPilot’s guidelines, so I removed it. Could you rephrase or ask in a different way?'

async function runWithClaude(sample: SampleFn, history: CoachMessage[], message: string, ws: CoachWorkspace, cb: CoachCallbacks, signal: AbortSignal): Promise<string> {
  const past = history
    .filter((m) => m.text.trim() && (m.role === 'user' || m.status === 'done'))
    .slice(-HISTORY_TURNS)
    .map((m) => ({ role: m.role, content: m.text }))
  const input = [{ role: 'user' as const, content: buildCoachInstructions(ws) }, ...past, { role: 'user' as const, content: message }]
  try {
    const { text } = await sample(input, {
      signal,
      cache: false,
      modelTier: 'quick',
      onText: ({ text }) => cb.onText(text),
      tools: COACH_TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        execute: (toolInput) => {
          const { event, result } = t.run(toolInput, ws)
          cb.onTool(event)
          return result
        },
      })),
    })
    return text
  } catch (e) {
    if (isSampleError(e)) {
      if (e.code === 'cancelled') throw new CoachError('Stopped', 'cancelled', false, e.text)
      throw new CoachError(sampleErrorCopy(e.code), e.code, PERMANENT_CODES.includes(e.code), e.text)
    }
    throw new CoachError(sampleErrorCopy('upstream_error'), 'upstream_error', false)
  }
}

/** Runs one coach turn on the given engine and returns the final, guardrail-checked text. */
export async function runCoach(
  engine: CoachEngine,
  history: CoachMessage[],
  message: string,
  ws: CoachWorkspace,
  cb: CoachCallbacks,
  signal: AbortSignal,
): Promise<string> {
  if (engine === 'claude') {
    const sample = await getClaude()
    if (!sample) throw new CoachError('Claude isn’t available here.', 'not_available', true)
    const text = await runWithClaude(sample, history, message, ws, cb, signal)
    if (checkConversationalText(text).length) {
      cb.onText(SAFE_REPLACEMENT)
      return SAFE_REPLACEMENT
    }
    return text
  }
  return runOfflineCoach(message, ws, cb)
}
