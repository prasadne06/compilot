// Product guardrails applied to every AI-generated string.
// The LLM explains deterministic results; it must never guarantee outcomes,
// claim private data, encourage deception, or tell users they must reject an offer.

const RULES: { id: string; pattern: RegExp }[] = [
  { id: 'guarantee', pattern: /\b(guarantee[sd]?|guaranteed to|you will (definitely|certainly) get)\b/i },
  { id: 'private-data', pattern: /\b(internal (comp|salary) data|we have access to|their (actual|exact) (band|budget) is)\b/i },
  { id: 'deception', pattern: /\b(pretend|bluff|make up|fabricate|say you have (another|a competing) offer)\b/i },
  { id: 'coercion', pattern: /\b(i know (you|your company) can afford|take it or leave it)\b/i },
  { id: 'must-reject', pattern: /\byou (must|should definitely) (reject|decline|turn down)\b/i },
  { id: 'financial-advice', pattern: /\b(as your financial advisor|this is financial advice)\b/i },
]

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectStrings(v, out))
  return out
}

/** Returns the ids of any violated rules across all strings in a structured response. */
export function checkGuardrails(value: unknown): string[] {
  const text = collectStrings(value).join('\n')
  return RULES.filter((r) => r.pattern.test(text)).map((r) => r.id)
}

/** Patterns in a user's practice response that coaching should flag (not block). */
export const RISKY_USER_PATTERNS = {
  ultimatum: /\b(or (else )?i('ll| will) (walk|leave|decline)|final answer|take it or leave it|non-?negotiable|i won'?t accept anything less)\b/i,
  coercion: /\b(i know (you|your company|you guys) can afford|you can obviously pay)\b/i,
  apologetic: /\b(sorry|i apologi[sz]e|i hate to (ask|bring)|i feel bad|i know this is a lot|if it'?s not too much|i hope this isn'?t)\b/i,
  hedging: /\b(maybe|i guess|kind of|sort of|possibly|just wondering|i was just|i think maybe|not sure if)\b/i,
}
