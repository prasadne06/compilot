import type { Analysis, EvaluationInputs } from '../../types'
import { LEVELS } from '../../data/benchmarks'
import { PRIORITY_OPTIONS, labelFor } from '../../data/options'

/**
 * The compact, structured context passed to every AI task.
 * It contains only user-provided facts and deterministic engine outputs.
 */
export interface AIContext {
  role: string
  levelLabel: string
  company: string
  location: string
  stage: string
  yearsRelevant?: number
  yearsExperience?: number
  offerBase: number
  offerTotalComp: number
  currentTotalComp?: number
  changeVsCurrent?: number
  basePercentile: number
  totalCompPercentile: number
  marketLow: number
  marketMedian: number
  marketHigh: number
  offerScore: number
  leverageScore: number
  leverageLabel: string
  leverageStrengths: string[]
  leverageWeaknesses: string[]
  confidence: number
  recommendationState: string
  target: number
  rangeLow: number
  rangeHigh: number
  fallback: number
  primaryAsk: string
  secondaryAsk: string
  fallbackAsk: string
  nonCashAsk?: string
  competing: { kind: 'written' | 'verbal' | 'multiple' | 'none'; base?: number }
  interviewingElsewhere: boolean
  fixedBand: boolean
  priorities: string[]
  hasEquity: boolean
  equityLiquid: boolean
  hasUnvested: boolean
}

export function buildAIContext(inputs: EvaluationInputs, a: Analysis): AIContext {
  const s = inputs.leverage.situations
  const kind = s.includes('multiple_offers') ? 'multiple' : s.includes('written_offer') ? 'written' : s.includes('verbal_offer') ? 'verbal' : 'none'
  return {
    role: inputs.offer.role || inputs.profile.jobTitle,
    levelLabel: LEVELS[a.benchmark.level].label,
    company: inputs.offer.company || 'the company',
    location: a.benchmark.locationLabel,
    stage: a.benchmark.stageLabel,
    yearsRelevant: inputs.profile.yearsRelevant,
    yearsExperience: inputs.profile.yearsExperience,
    offerBase: a.compensation.base,
    offerTotalComp: a.compensation.totalCompensation,
    currentTotalComp: a.compensation.currentTotalComp,
    changeVsCurrent: a.compensation.changeVsCurrent,
    basePercentile: a.marketPosition.basePercentile,
    totalCompPercentile: a.marketPosition.totalCompPercentile,
    marketLow: a.benchmark.base.low,
    marketMedian: a.benchmark.base.median,
    marketHigh: a.benchmark.base.high,
    offerScore: a.offerScore.score,
    leverageScore: a.leverage.score,
    leverageLabel: a.leverage.label,
    leverageStrengths: a.leverage.factors.filter((f) => f.kind === 'strength').map((f) => f.label),
    leverageWeaknesses: a.leverage.factors.filter((f) => f.kind === 'weakness').map((f) => f.label),
    confidence: a.confidence.score,
    recommendationState: a.recommendation.state,
    target: a.recommendation.target,
    rangeLow: a.recommendation.rangeLow,
    rangeHigh: a.recommendation.rangeHigh,
    fallback: a.recommendation.fallback,
    primaryAsk: a.strategy.primary.label,
    secondaryAsk: a.strategy.secondary.label,
    fallbackAsk: a.strategy.fallback.label,
    nonCashAsk: a.strategy.nonCash?.label,
    competing: { kind, base: kind === 'none' ? undefined : inputs.leverage.competing.base },
    interviewingElsewhere: s.includes('interviewing'),
    fixedBand: inputs.leverage.bandSignal === 'fixed',
    priorities: inputs.priorities.map((p) => labelFor(PRIORITY_OPTIONS, p)),
    hasEquity: a.compensation.annualEquity > 0,
    equityLiquid: a.compensation.equityIsLiquid,
    hasUnvested: (inputs.profile.currentEquity ?? 0) > 0 || (inputs.profile.currentBonus ?? 0) > 0,
  }
}
