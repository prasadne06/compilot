import type { AINarrative } from '../../types'
import { formatPercent, k, ordinal } from '../../lib/format'
import type { AIContext } from './context'
import { isObj, isStr, isStrArr, runTask, type AIResult } from './provider'

const isNarrative = (v: unknown): v is AINarrative =>
  isObj(v) && isStr(v.summary) && isStrArr(v.keyTakeaways) && isStr(v.recommendationExplanation) && isStr(v.leverageExplanation) && isStrArr(v.caveats)

function mockNarrative(c: AIContext): AINarrative {
  const change = c.changeVsCurrent
  const position =
    c.basePercentile >= 75 ? 'toward the upper end of'
    : c.basePercentile >= 55 ? 'somewhat above the middle of'
    : c.basePercentile >= 45 ? 'near the middle of'
    : 'below the middle of'

  const roleDesc = c.role.toLowerCase().includes(c.levelLabel.toLowerCase()) ? c.role : `${c.levelLabel.toLowerCase()} ${c.role}`
  const summary =
    `Based on the information provided, your ${k(c.offerBase)} base offer for a ${roleDesc} role in ${c.location} sits ${position} the estimated range ` +
    `(around the ${ordinal(c.basePercentile)} percentile). Including target bonus and annualized equity, estimated total compensation is about ${k(c.offerTotalComp)}` +
    (change !== undefined ? `, roughly ${formatPercent(change, 0, true)} versus your current package.` : '.')

  const takeaways: string[] = []
  takeaways.push(c.basePercentile >= 55 ? 'The offer is competitive on base relative to the illustrative benchmark.' : 'There appears to be room on base relative to the illustrative benchmark.')
  if (c.competing.kind !== 'none' && c.competing.base && c.competing.base > c.offerBase)
    takeaways.push(`Your ${c.competing.kind === 'multiple' ? 'other offers give' : `${c.competing.kind} competing offer at ${k(c.competing.base)} gives`} you a concrete, honest reference point.`)
  else if (c.leverageStrengths[0]) takeaways.push(`Your strongest leverage point: ${c.leverageStrengths[0].toLowerCase()}.`)
  takeaways.push(`One reasonable approach is to lead with ${c.primaryAsk.toLowerCase()}${c.primaryAsk.includes('base') ? ` and target around ${k(c.target)}` : ''}, keeping ${c.secondaryAsk.toLowerCase()} as a second lever.`)
  if (c.priorities[0]) takeaways.push(`Since ${c.priorities[0].toLowerCase()} is your top priority, weigh non-salary factors alongside the numbers.`)

  const recExplanation =
    c.recommendationState === 'strong'
      ? 'The offer scores well across market position and fit. Negotiating is optional; a single, light ask is low-risk if something matters to you.'
      : c.recommendationState === 'below'
        ? 'The offer appears to sit below the estimated range. It may be worth a substantive ask — and comparing it carefully with your alternatives.'
        : `The offer is reasonable, and your leverage (${c.leverageScore}/100) suggests a well-reasoned ask is unlikely to be surprising to the company. A target of ${k(c.target)} with a fallback of ${k(c.fallback)} keeps the ask grounded in the estimated range.`

  const levExplanation =
    `Leverage is ${c.leverageLabel.toLowerCase()} mainly because ${c.leverageStrengths.slice(0, 2).map((s) => s.toLowerCase()).join(' and ') || 'of your background'}.` +
    (c.leverageWeaknesses.length ? ` Keep in mind: ${c.leverageWeaknesses[0].toLowerCase()}.` : '')

  return {
    summary,
    keyTakeaways: takeaways.slice(0, 4),
    recommendationExplanation: recExplanation,
    leverageExplanation: levExplanation,
    caveats: [
      'Benchmarks are illustrative assumptions, not live market data.',
      c.hasEquity ? (c.equityLiquid ? 'Equity value can fluctuate with the stock price.' : 'Private-company equity may be illiquid and could become worthless.') : 'Bonus figures assume the target is paid out; actual payouts can vary.',
      `Confidence in this estimate is ${c.confidence}% — see the breakdown for what drives it.`,
    ],
  }
}

export function generateSalaryAnalysis(ctx: AIContext): Promise<AIResult<AINarrative>> {
  return runTask('salary_analysis', ctx, { mock: () => mockNarrative(ctx), validate: isNarrative, latencyMs: 1100 })
}
