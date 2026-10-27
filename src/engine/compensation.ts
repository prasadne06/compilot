import type { Compensation, EvaluationInputs } from '../types'
import { STAGES } from '../data/benchmarks'

/**
 * Annualized compensation model.
 * - Bonus uses the stated target (not guaranteed).
 * - Equity is annualized at the stated grant value (estimate, may fluctuate or become worthless).
 * - Signing bonus is kept separate from recurring compensation.
 */
export function calculateCompensation(inputs: EvaluationInputs): Compensation {
  const { offer, profile } = inputs
  const base = offer.base ?? 0
  const expectedBonus = base * ((offer.targetBonusPct ?? 0) / 100)
  const vesting = offer.vestingYears && offer.vestingYears > 0 ? offer.vestingYears : 4
  const annualEquity = (offer.equityTotal ?? 0) / vesting
  const otherAnnual = offer.otherAnnualComp ?? 0
  const signingBonus = offer.signingBonus ?? 0

  const cashCompensation = base + expectedBonus + otherAnnual
  const totalCompensation = cashCompensation + annualEquity
  const firstYearTotal = totalCompensation + signingBonus

  const currentTotalComp =
    profile.currentTotalComp ??
    (profile.currentBase !== undefined
      ? profile.currentBase + (profile.currentBonus ?? 0) + (profile.currentEquity ?? 0)
      : undefined)

  return {
    base,
    expectedBonus,
    annualEquity,
    otherAnnual,
    signingBonus,
    cashCompensation,
    totalCompensation,
    firstYearTotal,
    equityShare: totalCompensation > 0 ? annualEquity / totalCompensation : 0,
    currentTotalComp,
    changeVsCurrent: currentTotalComp ? totalCompensation / currentTotalComp - 1 : undefined,
    equityIsLiquid: STAGES[offer.companyStage].liquid,
  }
}
