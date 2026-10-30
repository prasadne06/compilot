import type {
  Analysis, CounterEvaluation, CounterMove, CounterOffer, EvaluationInputs, OfferSnapshot, Offer, WhatIfResult,
} from '../types'
import { formatCurrency, k, roundSalary } from '../lib/format'
import { analyzeOffer } from './index'

/** The offer fields a counter-offer or what-if may change. */
export type OfferPatch = Partial<Pick<Offer, 'base' | 'targetBonusPct' | 'signingBonus' | 'equityTotal' | 'vestingYears' | 'ptoDays'>>

export function snapshot(a: Analysis): OfferSnapshot {
  return {
    base: a.compensation.base,
    totalComp: Math.round(a.compensation.totalCompensation),
    firstYearTotal: Math.round(a.compensation.firstYearTotal),
    signingBonus: a.compensation.signingBonus,
    annualEquity: Math.round(a.compensation.annualEquity),
    offerScore: a.offerScore.score,
    basePercentile: a.marketPosition.basePercentile,
    changeVsCurrent: a.compensation.changeVsCurrent,
    recommendation: a.recommendation.state,
  }
}

function withOffer(inputs: EvaluationInputs, patch: OfferPatch): EvaluationInputs {
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined && Number.isFinite(v as number)))
  return { ...inputs, offer: { ...inputs.offer, ...clean } }
}

const LABELS: Record<keyof OfferPatch, string> = {
  base: 'base', targetBonusPct: 'target bonus', signingBonus: 'signing bonus', equityTotal: 'equity grant', vestingYears: 'vesting', ptoDays: 'PTO',
}

function describeChange(key: keyof OfferPatch, value: number): string {
  if (key === 'targetBonusPct') return `${LABELS[key]} ${value}%`
  if (key === 'vestingYears') return `${LABELS[key]} ${value} years`
  if (key === 'ptoDays') return `${LABELS[key]} ${value} days`
  return `${LABELS[key]} ${k(value)}`
}

/** Re-runs the full analysis on a hypothetical version of the offer. Never touches saved inputs. */
export function runWhatIf(inputs: EvaluationInputs, patch: OfferPatch, extra: { competingBase?: number } = {}): WhatIfResult {
  const before = analyzeOffer(inputs)
  let next = withOffer(inputs, patch)
  if (extra.competingBase !== undefined) next = { ...next, leverage: { ...next.leverage, competing: { ...next.leverage.competing, base: extra.competingBase } } }
  const after = analyzeOffer(next)
  const changes = (Object.keys(patch) as (keyof OfferPatch)[]).filter((key) => patch[key] !== undefined).map((key) => describeChange(key, patch[key] as number))
  if (extra.competingBase !== undefined) changes.push(`competing base ${k(extra.competingBase)}`)
  return { changes, before: snapshot(before), after: snapshot(after), leverageBefore: before.leverage.score, leverageAfter: after.leverage.score }
}

/** Fills fields the company didn't mention from the latest known terms (original offer, then earlier counters). */
export function counterTerms(inputs: EvaluationInputs, log: CounterOffer[], counter: Omit<CounterOffer, 'id' | 'at' | 'note'>): OfferPatch {
  const latest: OfferPatch = { base: inputs.offer.base, targetBonusPct: inputs.offer.targetBonusPct, signingBonus: inputs.offer.signingBonus, equityTotal: inputs.offer.equityTotal }
  for (const c of [...log, counter]) {
    if (c.base !== undefined) latest.base = c.base
    if (c.targetBonusPct !== undefined) latest.targetBonusPct = c.targetBonusPct
    if (c.signingBonus !== undefined) latest.signingBonus = c.signingBonus
    if (c.equityTotal !== undefined) latest.equityTotal = c.equityTotal
  }
  return latest
}

const MOVE_LABEL: Record<CounterMove, string> = {
  accept: 'Meets your target. Reasonable to accept',
  close: 'Within your range. Accept, or make one final small ask',
  counter: 'Below your fallback. Consider one more counter',
  pivot: 'Base looks constrained. Consider other levers',
  below_walk_away: 'Below your walk-away number',
}

/**
 * Compares a company response with the original offer and the user's numbers,
 * and suggests a next move with fixed rules. The AI explains it; it does not decide it.
 */
export function evaluateCounter(inputs: EvaluationInputs, log: CounterOffer[], counter: Omit<CounterOffer, 'id' | 'at' | 'note'>): CounterEvaluation {
  const originalAnalysis = analyzeOffer(inputs)
  const terms = counterTerms(inputs, log, counter)
  const counterAnalysis = analyzeOffer(withOffer(inputs, terms))
  const original = snapshot(originalAnalysis)
  const next = snapshot(counterAnalysis)
  const { target, fallback } = originalAnalysis.recommendation
  const walkAway = inputs.walkAway
  const round = log.length + 1
  const step = original.base >= 100_000 ? 5_000 : 1_000
  const reasons: string[] = []

  const baseUp = next.base - original.base
  const signingUp = next.signingBonus - original.signingBonus
  const equityUp = next.annualEquity - original.annualEquity

  let move: CounterMove
  let suggestedCounterBase: number | undefined
  let nextLever: string | undefined

  if (walkAway !== undefined && next.base < walkAway) {
    move = 'below_walk_away'
    reasons.push(`Base of ${formatCurrency(next.base)} is below the walk-away number you set (${formatCurrency(walkAway)}).`)
    reasons.push('Whether to continue is your call. One more clear ask is still reasonable if this role matters to you.')
    suggestedCounterBase = Math.max(walkAway, roundSalary((next.base + target) / 2))
  } else if (next.base >= target * 0.99) {
    move = 'accept'
    reasons.push(`Base of ${formatCurrency(next.base)} meets your ${formatCurrency(target)} target.`)
  } else if (next.base >= fallback) {
    move = 'close'
    reasons.push(`Base of ${formatCurrency(next.base)} is at or above your ${formatCurrency(fallback)} fallback.`)
    nextLever = signingUp > 0 ? (equityUp > 0 ? undefined : 'equity') : 'signing bonus'
    if (nextLever) reasons.push(`If you want one last ask, ${nextLever === 'equity' ? 'a bit more equity' : 'a signing bonus'} is a low-friction way to close the remaining gap.`)
  } else if (round >= 2 && baseUp <= step) {
    move = 'pivot'
    reasons.push('Base has barely moved across rounds, which suggests a fixed band.')
    nextLever = signingUp > 0 ? 'equity or an early compensation review' : 'signing bonus'
  } else {
    move = 'counter'
    suggestedCounterBase = Math.max(roundSalary((next.base + target) / 2), next.base + step)
    reasons.push(`Base of ${formatCurrency(next.base)} is below your ${formatCurrency(fallback)} fallback.`)
    reasons.push(`Meeting in the middle would be about ${formatCurrency(suggestedCounterBase)}.`)
  }
  if (signingUp > 0) reasons.push(`They added ${formatCurrency(signingUp)} in signing bonus (one-time).`)
  if (equityUp > 0) reasons.push(`Equity is up about ${formatCurrency(equityUp)} per year (an estimate, not guaranteed).`)
  if (round >= 3 && move !== 'accept') reasons.push('This is round 3 or later. Most negotiations settle around here, so a final, specific ask tends to work best.')

  return {
    original, counter: next,
    baseIncrease: baseUp,
    totalCompIncrease: next.totalComp - original.totalComp,
    firstYearIncrease: next.firstYearTotal - original.firstYearTotal,
    target, fallback, walkAway, round,
    move, moveLabel: MOVE_LABEL[move], reasons, suggestedCounterBase, nextLever,
  }
}
