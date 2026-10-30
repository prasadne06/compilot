import { evaluateCounter } from '../../../engine'
import { k } from '../../../lib/format'
import type { Analysis, CounterOffer, EvaluationInputs } from '../../../types'

export type SuggestionKind = 'counter' | 'what_if' | 'why' | 'decide' | 'draft' | 'plan'

export interface Suggestion {
  kind: SuggestionKind
  text: string
}

const norm = (t: string) => t.trim().toLowerCase()

/**
 * Prompts that fit the active offer and where the negotiation stands, most relevant first.
 * Anything already asked in this conversation is left out.
 */
export function coachSuggestions(inputs: EvaluationInputs, a: Analysis, counters: CounterOffer[], asked: string[] = [], limit = 4): Suggestion[] {
  const r = a.recommendation
  const company = inputs.offer.company.trim() || 'the company'
  const out: Suggestion[] = []
  const add = (kind: SuggestionKind, text: string, when = true) => { if (when) out.push({ kind, text }) }

  const last = counters[counters.length - 1]
  if (last) {
    // Mid-negotiation: respond to their latest move
    const e = evaluateCounter(inputs, counters.slice(0, -1), last)
    const round = counters.length
    add('decide', `Should I accept their latest offer (${k(e.counter.base)} base)?`)
    add('draft', `Draft my reply to round ${round}`)
    add('what_if', `What if I counter at ${k(e.suggestedCounterBase ?? r.target)}?`, e.move === 'counter' || e.move === 'below_walk_away')
    add('what_if', `What if they add a ${k(Math.max(10_000, Math.round((r.target - e.counter.base) / 5_000) * 5_000))} signing bonus instead?`, e.move === 'pivot' || e.move === 'close')
    add('counter', `They came back again with ${k(Math.min(e.counter.base + 5_000, r.target))} base`)
    add('plan', 'How do I decide my walk-away number?', inputs.walkAway === undefined)
  } else {
    // Before the company has responded: prepare the first ask
    const s = new Set(inputs.leverage.situations)
    const competing = inputs.leverage.competing.base
    add('draft', `Draft my opening ask to ${company}`)
    add('plan', `How should I mention my ${competing ? k(competing) + ' ' : ''}competing offer?`, (s.has('written_offer') || s.has('multiple_offers') || s.has('verbal_offer')))
    add('why', 'Is this offer below market?', a.marketPosition.basePercentile < 45)
    add('what_if', `What if base goes to ${k(r.target)}?`)
    add('plan', 'Should I ask for a signing bonus?', !inputs.offer.signingBonus)
    add('why', `How much is the ${k(inputs.offer.equityTotal)} equity really worth?`, !!inputs.offer.equityTotal && !a.compensation.equityIsLiquid)
    add('why', `Why is my leverage ${a.leverage.score}?`)
    add('plan', 'How do I decide my walk-away number?', inputs.walkAway === undefined)
    add('counter', `They offered ${k(r.fallback)} base and a $10K signing bonus`)
  }

  const seen = new Set(asked.map(norm))
  return out.filter((x) => !seen.has(norm(x.text))).slice(0, limit)
}
