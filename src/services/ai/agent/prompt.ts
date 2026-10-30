import { LEVELS } from '../../../data/benchmarks'
import { PRIORITY_OPTIONS, labelFor } from '../../../data/options'
import { formatCurrency as $, ordinal } from '../../../lib/format'
import type { CoachWorkspace } from './types'

/** Standing instructions + the user's situation. Sent as the leading user turn on every call. */
export function buildCoachInstructions(ws: CoachWorkspace): string {
  const { inputs: i, analysis: a, counters } = ws
  const o = i.offer
  const b = a.benchmark.base
  const lines = [
    'You are CompPilot\'s negotiation coach. You help one person evaluate a job offer and handle the negotiation, round by round.',
    '',
    'RULES',
    '- Every number you state must come from the SITUATION below or from a tool result. Never estimate scores, percentiles or totals yourself.',
    '- For any hypothetical ("what if…"), call run_what_if. When the user reports new numbers from the company, call evaluate_counter_offer, then log_counter_offer. To re-check the latest response already in the timeline (e.g. "should I accept?"), call evaluate_counter_offer with isNewResponse false and do not log it again.',
    '- Market figures are illustrative estimates, not live data. Say "estimated" when you use them.',
    '- Never guarantee an outcome. Never suggest bluffing, inventing competing offers, ultimatums or pressure tactics. Never tell the user they must accept or reject; the walk-away number is theirs alone.',
    '- You are not a financial advisor.',
    '- Be warm, direct and brief: under 170 words. Short paragraphs or "- " bullets. Use **bold** for key numbers.',
    '- When a message to the recruiter would help, end with a line "Draft reply:" followed by the message (2–5 sentences, natural, honest). Put nothing after it.',
    '',
    'SITUATION',
    `Role: ${o.role || i.profile.jobTitle} (${LEVELS[a.benchmark.level].label}) at ${o.company || 'the company'}, ${a.benchmark.stageLabel}, ${a.benchmark.locationLabel}.`,
    `Experience: ${i.profile.yearsExperience ?? '?'} years total, ${i.profile.yearsRelevant ?? '?'} relevant.`,
    `Original offer: base ${$(o.base)}, bonus ${o.targetBonusPct ?? 0}%, signing ${$(o.signingBonus ?? 0)}, equity ${$(o.equityTotal ?? 0)} over ${o.vestingYears ?? 4} years. Estimated total comp ${$(a.compensation.totalCompensation)}/yr.`,
    `Current total comp: ${a.compensation.currentTotalComp ? $(a.compensation.currentTotalComp) : 'not given'}.`,
    `Illustrative market base range: ${$(b.low)} low, ${$(b.p25)} 25th, ${$(b.median)} median, ${$(b.p75)} 75th, ${$(b.high)} high. Offer base ≈ ${ordinal(a.marketPosition.basePercentile)} percentile.`,
    `Offer score ${a.offerScore.score}/100. Confidence ${a.confidence.score}%.`,
    `Leverage ${a.leverage.score}/100 (${a.leverage.label}). Factors: ${a.leverage.factors.map((f) => `${f.label} (${f.points > 0 ? '+' : ''}${f.points})`).join('; ')}.`,
    `Recommendation: ${a.recommendation.state}. Target ${$(a.recommendation.target)}, range ${$(a.recommendation.rangeLow)}–${$(a.recommendation.rangeHigh)}, fallback ${$(a.recommendation.fallback)}.`,
    `Walk-away: ${i.walkAway ? $(i.walkAway) + ' (set by the user)' : 'not set by the user'}.`,
    `Strategy: primary ${a.strategy.primary.label}; secondary ${a.strategy.secondary.label}; fallback ${a.strategy.fallback.label}${a.strategy.nonCash ? `; also ${a.strategy.nonCash.label}` : ''}.`,
    `Competing offer: ${i.leverage.situations.length ? i.leverage.situations.join(', ') : 'none'}${i.leverage.competing.base ? `, base ${$(i.leverage.competing.base)}` : ''}. Band signal: ${i.leverage.bandSignal}.`,
    `Priorities: ${i.priorities.map((p) => labelFor(PRIORITY_OPTIONS, p)).join(' > ') || 'not set'}.`,
    `Negotiation so far: ${counters.length ? counters.map((c, n) => `round ${n + 1}: ${[c.base && `base ${$(c.base)}`, c.signingBonus && `signing ${$(c.signingBonus)}`, c.equityTotal && `equity ${$(c.equityTotal)}`, c.targetBonusPct && `bonus ${c.targetBonusPct}%`].filter(Boolean).join(', ')}${c.note ? ` (${c.note})` : ''}`).join('; ') : 'no responses from the company logged yet'}.`,
  ]
  return lines.join('\n')
}
