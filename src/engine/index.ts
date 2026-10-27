import type { Analysis, EvaluationInputs } from '../types'
import { buildBenchmark } from './benchmark'
import { calculateCompensation } from './compensation'
import { buildStrategy, calculateRecommendation } from './recommendation'
import {
  calculateConfidence, calculateMarketPosition, calculateNegotiationLeverage, calculateOfferScore, rangeWidening,
} from './scoring'

export * from './benchmark'
export * from './compensation'
export * from './recommendation'
export * from './scoring'

/** Deterministic analysis pipeline. All math lives here — the AI layer only explains it. */
export function analyzeOffer(inputs: EvaluationInputs): Analysis {
  const confidence = calculateConfidence(inputs)
  const benchmark = buildBenchmark(inputs, rangeWidening(confidence))
  const compensation = calculateCompensation(inputs)
  const marketPosition = calculateMarketPosition(compensation, benchmark)
  const offerScore = calculateOfferScore(inputs, compensation, benchmark, marketPosition)
  const leverage = calculateNegotiationLeverage(inputs, compensation, benchmark)
  const recommendation = calculateRecommendation(inputs, compensation, benchmark, marketPosition, offerScore, leverage)
  const strategy = buildStrategy(inputs, compensation, benchmark, marketPosition, recommendation, leverage)
  return { compensation, benchmark, offerScore, marketPosition, leverage, confidence, recommendation, strategy }
}

export interface StepValidation {
  valid: boolean
  errors: Record<string, string>
}

export function validateAboutYou(i: EvaluationInputs): StepValidation {
  const e: Record<string, string> = {}
  if (!i.profile.jobTitle.trim()) e.jobTitle = 'Add your job title so we can find comparable roles.'
  if (!i.profile.location) e.location = 'Location has a large effect on pay — please choose one.'
  if (i.profile.yearsRelevant !== undefined && i.profile.yearsExperience !== undefined && i.profile.yearsRelevant > i.profile.yearsExperience)
    e.yearsRelevant = 'Relevant experience can’t exceed total experience.'
  return { valid: Object.keys(e).length === 0, errors: e }
}

export function validateOffer(i: EvaluationInputs): StepValidation {
  const e: Record<string, string> = {}
  if (!i.offer.base || i.offer.base < 10_000) e.base = 'Enter the offered base salary (annual).'
  if (i.offer.targetBonusPct !== undefined && (i.offer.targetBonusPct < 0 || i.offer.targetBonusPct > 200)) e.targetBonusPct = 'Enter a bonus between 0% and 200%.'
  return { valid: Object.keys(e).length === 0, errors: e }
}

export function isReadyForAnalysis(i: EvaluationInputs): boolean {
  return validateAboutYou(i).valid && validateOffer(i).valid
}
