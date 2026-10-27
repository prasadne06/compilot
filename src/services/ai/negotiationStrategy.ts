import { k } from '../../lib/format'
import type { AIContext } from './context'
import { isObj, isStr, isStrArr, runTask, type AIResult } from './provider'

export interface StrategyCoaching {
  coachNote: string
  talkingPoints: string[]
}

const isCoaching = (v: unknown): v is StrategyCoaching => isObj(v) && isStr(v.coachNote) && isStrArr(v.talkingPoints)

function mockCoaching(c: AIContext): StrategyCoaching {
  const points: string[] = []
  if (c.yearsRelevant !== undefined) points.push(`${c.yearsRelevant} years of directly relevant experience, and the specific outcomes you've delivered in that time.`)
  points.push(`The scope of this ${c.role} role and how your background maps to its first-year priorities.`)
  points.push(`Comparable ${c.levelLabel.toLowerCase()} roles in ${c.location} appear to range roughly ${k(c.marketLow)}–${k(c.marketHigh)} on base (illustrative estimate).`)
  if (c.competing.kind !== 'none')
    points.push(c.competing.base
      ? `You have a ${c.competing.kind === 'multiple' ? 'set of offers' : `${c.competing.kind} offer`} at ${k(c.competing.base)} base — mention it factually, without pressure.`
      : `You have ${c.competing.kind === 'multiple' ? 'other offers' : `a ${c.competing.kind} offer`} — mention it factually if you're comfortable.`)
  if (c.hasUnvested) points.push('Any bonus or unvested equity you would forfeit by leaving — a fair basis for a signing bonus.')

  const coachNote =
    c.recommendationState === 'strong'
      ? 'This is already a strong package. If you ask, keep it to one item and frame it as "making a yes easy".'
      : c.fixedBand
        ? 'Since they described the band as fixed, respect that boundary and redirect energy toward equity, signing bonus, or an early review.'
        : `Lead with one clear number (${k(c.target)}), give a short reason, then stop talking. Most of the work is done by being specific and calm.`

  return { coachNote, talkingPoints: points.slice(0, 5) }
}

export function generateStrategyCoaching(ctx: AIContext): Promise<AIResult<StrategyCoaching>> {
  return runTask('negotiation_strategy', ctx, { mock: () => mockCoaching(ctx), validate: isCoaching, latencyMs: 800 })
}
