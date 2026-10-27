import type {
  Benchmark, Compensation, EvaluationInputs, MarketPosition, NegotiationLeverage, NegotiationStrategy,
  OfferScore, Recommendation, RecommendationState, StrategyAsk,
} from '../types'
import { STAGES } from '../data/benchmarks'
import { PRIORITY_OPTIONS, labelFor } from '../data/options'
import { k, ordinal, roundSalary } from '../lib/format'

export const RECOMMENDATION_COPY: Record<RecommendationState, { title: string; tone: 'good' | 'caution' | 'serious' | 'critical' }> = {
  strong: { title: 'Strong Offer', tone: 'good' },
  consider: { title: 'Good Offer — Consider Negotiating', tone: 'caution' },
  negotiate: { title: 'Negotiate', tone: 'serious' },
  below: { title: 'Below Market — Reconsider', tone: 'critical' },
}

function decideState(score: OfferScore, pos: MarketPosition, lev: NegotiationLeverage, comp: Compensation, competingBase?: number): RecommendationState {
  const change = comp.changeVsCurrent
  if ((pos.basePercentile < 25 && pos.totalCompPercentile < 30) || (change !== undefined && change < -0.05 && pos.totalCompPercentile < 40)) return 'below'
  const competingHigher = competingBase !== undefined && competingBase > comp.base
  if (score.score >= 82 && !competingHigher && (lev.score < 70 || pos.basePercentile >= 80)) return 'strong'
  if (score.score < 65 || (lev.score >= 65 && (pos.basePercentile < 75 || competingHigher))) return 'negotiate'
  return 'consider'
}

export function calculateRecommendation(
  inputs: EvaluationInputs, comp: Compensation, bench: Benchmark, pos: MarketPosition, score: OfferScore, lev: NegotiationLeverage,
): Recommendation {
  const offer = comp.base
  const competing = inputs.leverage.competing.base
  const state = decideState(score, pos, lev, comp, competing)

  const askPct = state === 'strong' ? 0.04 : lev.score >= 75 ? 0.1 : lev.score >= 60 ? 0.08 : lev.score >= 40 ? 0.06 : 0.04
  let target = offer * (1 + askPct)
  if (offer < bench.base.p75) target = Math.max(target, Math.min(bench.base.p75, offer * 1.12))
  if (state === 'below') target = Math.max(target, bench.base.median)
  if (competing && competing > offer) target = Math.max(target, competing)
  target = Math.min(target, Math.max(bench.base.high, competing ?? 0), offer * 1.18)
  const step = offer >= 100_000 ? 5_000 : 1_000
  // Keep at least two steps between offer and target so the fallback is meaningfully distinct
  target = Math.max(roundSalary(target), offer + 2 * step)

  const rangeLow = Math.max(roundSalary(target * 0.975), offer + step)
  const rangeHigh = Math.max(roundSalary(target * 1.025), target)
  const fallback = Math.min(Math.max(roundSalary(offer + (target - offer) * 0.5), offer + step), target - step)

  const rationale: string[] = []
  rationale.push(`Your base is estimated near the ${ordinal(pos.basePercentile)} percentile of an illustrative ${k(bench.base.low)}–${k(bench.base.high)} range.`)
  if (competing && competing > offer) rationale.push(`Your competing offer (${k(competing)} base) is a concrete reference point above this offer.`)
  rationale.push(`Your leverage is ${lev.label.toLowerCase()} (${lev.score}/100), which supports a ${askPct >= 0.08 ? 'confident' : 'measured'} ask of roughly ${Math.round((target / offer - 1) * 100)}% above the offer.`)
  if (target >= bench.base.p75) rationale.push(`The target sits around the upper part of the estimated range — ambitious but defensible.`)
  else rationale.push(`The target stays within the estimated range, which keeps the ask grounded.`)

  const headline: Record<RecommendationState, string> = {
    strong: 'Based on the information provided, this offer looks strong. A light-touch ask is optional, not essential.',
    consider: 'This looks like a good offer. A focused, well-reasoned ask could still be worthwhile.',
    negotiate: 'Your offer is competitive, but there are several credible reasons to negotiate.',
    below: 'Based on the information provided, this offer appears below the estimated market. It may be worth negotiating meaningfully — or weighing your alternatives.',
  }

  return { state, headline: headline[state], target, rangeLow, rangeHigh, fallback, rationale }
}

// ---------------------------------------------------------------------------
// Strategy
// ---------------------------------------------------------------------------

const ASKS = {
  base: (target: number): StrategyAsk => ({ type: 'base', label: 'Increase base salary', detail: `Ask for ${k(target)} base — it compounds into bonus, future raises and your next offer.` }),
  equity: (detail?: string): StrategyAsk => ({ type: 'equity', label: 'Increase equity', detail: detail ?? 'Ask whether there is flexibility on the equity grant.' }),
  signing: (detail?: string): StrategyAsk => ({ type: 'signing', label: 'Signing bonus', detail: detail ?? 'A one-time signing bonus can bridge a gap when base is constrained.' }),
  bonus: (): StrategyAsk => ({ type: 'bonus', label: 'Higher target bonus', detail: 'Ask whether the target bonus percentage has flexibility at this level.' }),
}

function nonCashFor(top: string | undefined): StrategyAsk | undefined {
  switch (top) {
    case 'growth': return { type: 'level_review', label: 'Growth commitment', detail: 'Ask for a documented 6–12 month performance and level review, with clear expectations for the next level.' }
    case 'learning': return { type: 'level_review', label: 'Learning support', detail: 'Ask about a learning & development budget, conference time, or mentorship.' }
    case 'title': return { type: 'title', label: 'Title & level', detail: 'Ask how the title and level were determined, and whether the scope supports the next level.' }
    case 'remote': return { type: 'remote', label: 'Flexibility', detail: 'Confirm remote/hybrid expectations in writing, including in-office days.' }
    case 'wlb': return { type: 'pto', label: 'Time off', detail: 'Ask about additional PTO or a flexible start date to recharge between roles.' }
    default: return undefined
  }
}

export function buildStrategy(inputs: EvaluationInputs, comp: Compensation, bench: Benchmark, pos: MarketPosition, rec: Recommendation, lev: NegotiationLeverage): NegotiationStrategy {
  const stage = inputs.offer.companyStage
  const top = inputs.priorities[0]
  const fixedBand = inputs.leverage.bandSignal === 'fixed'
  const hasEquity = comp.annualEquity > 0 || stage !== 'enterprise'
  const unvested = (inputs.profile.currentEquity ?? 0) > 0 || (inputs.profile.currentBonus ?? 0) > 0

  let primary: StrategyAsk
  let secondary: StrategyAsk
  let fallback: StrategyAsk

  if (fixedBand) {
    primary = hasEquity
      ? ASKS.equity(`Since base may be fixed, ask for a larger equity grant — or confirm the offer is at the top of the band.`)
      : ASKS.signing()
    secondary = ASKS.signing(unvested ? 'A signing bonus can offset bonus or unvested equity you would leave behind.' : undefined)
    fallback = { type: 'level_review', label: 'Early compensation review', detail: 'Ask for a documented compensation review at 6 months.' }
    if (primary.type === 'signing') secondary = ASKS.bonus()
  } else if (top === 'equity' && hasEquity && stage !== 'enterprise') {
    primary = ASKS.equity(`Equity upside is your top priority — ask for a larger grant (e.g. ~${k((comp.annualEquity || bench.typicalEquityAnnual) * 1.25 * (inputs.offer.vestingYears ?? 4))} total).`)
    secondary = ASKS.base(rec.target)
    fallback = ASKS.signing()
  } else if (pos.basePercentile >= 85) {
    primary = hasEquity ? ASKS.equity('Base is already near the top of the estimated range, so equity is the more natural lever.') : ASKS.signing()
    secondary = ASKS.signing()
    fallback = ASKS.bonus()
    if (primary.type === 'signing') secondary = ASKS.bonus()
  } else {
    primary = ASKS.base(rec.target)
    secondary = stage === 'enterprise' ? ASKS.bonus() : ASKS.equity()
    fallback = ASKS.signing(unvested ? 'If base is capped, a signing bonus can offset bonus or unvested equity you would leave behind.' : undefined)
  }

  const avoid = ['Negotiating too many items at once — lead with one primary ask', 'Accepting verbally before you see the revised offer in writing']
  const hasAlt = inputs.leverage.situations.some((s) => ['written_offer', 'multiple_offers', 'verbal_offer'].includes(s))
  if (!hasAlt) avoid.push("Implying you have other offers you don't have")
  if (fixedBand) avoid.push('Repeatedly pushing base after the band has been confirmed')
  avoid.push('Ultimatums, unless you are genuinely prepared to walk away')

  const why: string[] = []
  const pLabels = inputs.priorities.slice(0, 3).map((p) => labelFor(PRIORITY_OPTIONS, p).toLowerCase())
  if (primary.type === 'base') why.push(`Base is estimated at the ${ordinal(pos.basePercentile)} percentile, so there is room toward the upper part of the range.`)
  if (primary.type === 'equity' && pos.basePercentile >= 85) why.push('Base already sits near the top of the estimated range, so equity is a more realistic lever.')
  if (inputs.leverage.competing.base && inputs.leverage.competing.base > comp.base) why.push(`Your competing offer at ${k(inputs.leverage.competing.base)} base gives a specific, honest reference point.`)
  if (fixedBand) why.push('The company indicated a fixed band, so the strategy favors levers outside base.')
  if (pLabels.length) why.push(`Your priorities (${pLabels.join(', ')}) shaped the order of asks${nonCashFor(top) ? ' and the non-cash ask' : ''}.`)
  why.push(STAGES[stage].bandNote)
  if (lev.score < 45) why.push('With moderate leverage, one clear, well-justified ask tends to land better than several.')

  const sequencing = [
    'Open with enthusiasm for the role and team.',
    `Make your primary ask with a specific number${primary.type === 'base' ? ` (${k(rec.target)})` : ''} and a short reason.`,
    'Pause and let them respond — silence is fine.',
    `If they can't move, pivot to your secondary ask (${secondary.label.toLowerCase()}), then your fallback (${fallback.label.toLowerCase()}).`,
    'Ask for the final package in writing before you accept.',
  ]

  return { primary, secondary, fallback, nonCash: nonCashFor(top), avoid, why, sequencing }
}
