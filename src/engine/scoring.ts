import type {
  Benchmark, Compensation, Confidence, ConfidenceFactor, EvaluationInputs, LeverageFactor, MarketPosition,
  MarketRange, MatchQuality, NegotiationLeverage, OfferScore, Priority, ScoreComponent,
} from '../types'
import { LEVELS, STAGES } from '../data/benchmarks'
import { clamp, formatPercent, k, ordinal } from '../lib/format'
import { effectiveLevel, inferRoleFamily, resolveIndustry, resolveLocation } from './benchmark'

// ---------------------------------------------------------------------------
// Market position
// ---------------------------------------------------------------------------

/** Piecewise-linear percentile estimate within an illustrative range. */
export function percentileIn(range: MarketRange, value: number): number {
  const pts: [number, number][] = [
    [range.low, 10], [range.p25, 25], [range.median, 50], [range.p75, 75], [range.high, 90],
  ]
  if (value <= pts[0][0]) {
    const span = range.low * 0.1
    return clamp(10 - ((range.low - value) / span) * 9, 1, 10)
  }
  if (value >= pts[4][0]) {
    const span = range.high * 0.1
    return clamp(90 + ((value - range.high) / span) * 9, 90, 99)
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    if (value >= x0 && value <= x1) return y0 + ((value - x0) / (x1 - x0)) * (y1 - y0)
  }
  return 50
}

export function calculateMarketPosition(comp: Compensation, bench: Benchmark): MarketPosition {
  const basePercentile = Math.round(percentileIn(bench.base, comp.base))
  const totalCompPercentile = Math.round(percentileIn(bench.totalComp, comp.totalCompensation))
  const label =
    basePercentile >= 75 ? 'Upper end of estimated range'
    : basePercentile >= 55 ? 'Above estimated midpoint'
    : basePercentile >= 45 ? 'Near estimated midpoint'
    : basePercentile >= 25 ? 'Below estimated midpoint'
    : 'Low end of estimated range'
  return { basePercentile, totalCompPercentile, baseVsMedian: comp.base / bench.base.median - 1, label }
}

// ---------------------------------------------------------------------------
// Offer score
// ---------------------------------------------------------------------------

function changeScore(change: number | undefined): number {
  if (change === undefined) return 50
  // -10% → 0, 0% → 35, +10% → 60, +20% → 80, +30% → 95
  const pts: [number, number][] = [[-0.1, 0], [0, 35], [0.1, 60], [0.2, 80], [0.3, 95], [0.5, 100]]
  if (change <= pts[0][0]) return 0
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    if (change <= x1) return y0 + ((change - x0) / (x1 - x0)) * (y1 - y0)
  }
  return 100
}

function priorityFit(p: Priority, inputs: EvaluationInputs, comp: Compensation, bench: Benchmark, pos: MarketPosition): { score: number; note: string } {
  const { offer } = inputs
  switch (p) {
    case 'base': return { score: pos.basePercentile, note: `base at ~${ordinal(pos.basePercentile)} percentile` }
    case 'total_comp': return { score: pos.totalCompPercentile, note: `total comp at ~${ordinal(pos.totalCompPercentile)} percentile` }
    case 'equity': {
      const ratio = bench.typicalEquityAnnual > 0 ? comp.annualEquity / bench.typicalEquityAnnual : 0
      return { score: clamp(ratio * 55, 0, 100), note: `equity ${ratio >= 1 ? 'at or above' : 'below'} typical for stage` }
    }
    case 'remote': {
      const s = offer.remotePolicy === 'remote' ? 95 : offer.remotePolicy === 'hybrid' ? 70 : offer.remotePolicy === 'onsite' ? 30 : 50
      return { score: s, note: offer.remotePolicy ? `${offer.remotePolicy} policy` : 'remote policy not specified' }
    }
    case 'wlb': {
      const d = offer.ptoDays
      return { score: d === undefined ? 50 : clamp(30 + d * 2.5, 20, 100), note: d === undefined ? 'PTO not specified' : `${d} PTO days` }
    }
    case 'benefits':
      return { score: offer.benefitsNotes.trim() || comp.otherAnnual > 0 ? 70 : 50, note: 'benefits listed' }
    case 'stability': {
      const s: Record<string, number> = { early: 35, growth: 58, late: 65, public: 80, enterprise: 85, unknown: 55 }
      return { score: s[offer.companyStage], note: STAGES[offer.companyStage].label.toLowerCase() }
    }
    default:
      // Growth, learning, title, brand — not measurable from compensation inputs.
      return { score: 60, note: 'assessed qualitatively' }
  }
}

export function calculateOfferScore(inputs: EvaluationInputs, comp: Compensation, bench: Benchmark, pos: MarketPosition): OfferScore {
  const components: ScoreComponent[] = []

  components.push({
    label: 'Base vs. estimated market', weight: 0.35, score: pos.basePercentile,
    detail: `Base is estimated near the ${ordinal(pos.basePercentile)} percentile of the illustrative range.`,
  })
  components.push({
    label: 'Total comp vs. estimated market', weight: 0.25, score: pos.totalCompPercentile,
    detail: `Estimated total compensation is near the ${ordinal(pos.totalCompPercentile)} percentile.`,
  })
  components.push({
    label: 'Change vs. current compensation', weight: 0.15, score: Math.round(changeScore(comp.changeVsCurrent)),
    detail: comp.changeVsCurrent === undefined
      ? 'Current compensation not provided — scored as neutral.'
      : `Estimated total comp is ${formatPercent(comp.changeVsCurrent, 0, true)} vs. your current package.`,
  })

  let structure = 60
  const notes: string[] = []
  if ((inputs.offer.targetBonusPct ?? 0) / 100 >= bench.typicalBonusPct && bench.typicalBonusPct > 0) { structure += 10; notes.push('bonus at/above typical') }
  if (comp.signingBonus > 0) { structure += 8; notes.push('includes a signing bonus') }
  if (inputs.offer.ptoDays !== undefined) {
    if (inputs.offer.ptoDays >= 20) { structure += 10; notes.push('generous PTO') }
    else if (inputs.offer.ptoDays < 15) { structure -= 10; notes.push('limited PTO') }
  }
  if (comp.equityShare > 0.35 && !comp.equityIsLiquid) { structure -= 15; notes.push('large share in illiquid equity') }
  components.push({
    label: 'Package structure', weight: 0.1, score: clamp(structure, 0, 100),
    detail: notes.length ? `Notable: ${notes.join(', ')}.` : 'Standard package structure.',
  })

  const top = inputs.priorities.slice(0, 3)
  const weights = [0.5, 0.3, 0.2]
  let fit = 60
  let fitDetail = 'No priorities selected — scored as neutral.'
  if (top.length) {
    const fits = top.map((p) => priorityFit(p, inputs, comp, bench, pos))
    const wsum = weights.slice(0, top.length).reduce((a, b) => a + b, 0)
    fit = fits.reduce((acc, f, i) => acc + f.score * weights[i], 0) / wsum
    fitDetail = `Weighted by your top priorities (${fits.map((f) => f.note).join('; ')}).`
  }
  components.push({ label: 'Fit with your priorities', weight: 0.15, score: Math.round(fit), detail: fitDetail })

  const score = Math.round(components.reduce((acc, c) => acc + c.score * c.weight, 0))
  return { score: clamp(score, 1, 99), components }
}

// ---------------------------------------------------------------------------
// Negotiation leverage — transparent additive model
// ---------------------------------------------------------------------------

export const LEVERAGE_BASELINE = 30

export function calculateNegotiationLeverage(inputs: EvaluationInputs, comp: Compensation, bench: Benchmark): NegotiationLeverage {
  const f: LeverageFactor[] = []
  const add = (kind: LeverageFactor['kind'], label: string, points: number, detail: string) => f.push({ kind, label, points, detail })
  const s = new Set(inputs.leverage.situations)
  const { competing, uniqueExpertise, bandSignal } = inputs.leverage

  // Alternatives — the strongest single signal counts in full.
  if (s.has('multiple_offers')) add('strength', 'You have multiple offers', 26, 'Several real alternatives give you the most room to ask.')
  else if (s.has('written_offer')) add('strength', 'You have a written competing offer', 22, 'A documented alternative is a credible, verifiable reason to ask.')
  else if (s.has('verbal_offer')) add('strength', 'You have a verbal offer elsewhere', 13, 'Helpful, though less concrete than a written offer.')
  else if (s.has('interviewing')) add('strength', 'You are interviewing elsewhere', 7, 'Active processes signal you have options.')

  if (s.has('internal_promotion')) add('strength', 'Internal promotion is on the table', 10, 'Staying could also mean a step up, which strengthens your alternative.')
  if (s.has('not_looking')) add('strength', 'You are not actively looking', 8, 'Staying put is a genuine option, so you can afford to ask.')
  if (s.has('recruiter_outreach')) add('strength', 'The company reached out to you', 5, 'They initiated the process, which often signals specific interest.')

  const hasAlt = ['multiple_offers', 'written_offer', 'verbal_offer'].some((x) => s.has(x as never))
  if (hasAlt && competing.base && comp.base > 0) {
    const gap = competing.base / comp.base - 1
    if (gap >= 0.05) add('strength', 'Your competing offer is higher', 10, `The competing base (${k(competing.base)}) is ${formatPercent(gap)} above this offer.`)
    else if (gap > 0) add('strength', 'Your competing offer is slightly higher', 5, `The competing base (${k(competing.base)}) is modestly above this offer.`)
    else add('weakness', 'Your competing offer is not higher', -4, 'The alternative pays less on base, so it supports fit/terms more than a higher number.')
  }
  if (!hasAlt && !s.has('internal_promotion') && !s.has('not_looking')) {
    add('weakness', 'No competing offer', -6, 'Without a concrete alternative, lean on market data and the value you bring.')
  }

  // Experience relative to level
  const level = effectiveLevel(inputs)
  const [minY, maxY] = LEVELS[level].expectedYears
  const yrs = inputs.profile.yearsRelevant ?? inputs.profile.yearsExperience
  if (yrs !== undefined) {
    if (yrs > maxY) add('strength', 'Experience above typical for this level', 12, `${yrs} relevant years vs. a typical ${minY}–${maxY} for ${LEVELS[level].label}.`)
    else if (yrs >= (minY + maxY) / 2) add('strength', 'Strong relevant experience', 8, `${yrs} relevant years is in the upper half of the typical range for this level.`)
    else if (yrs < minY) add('weakness', 'Experience below typical for this level', -6, `${yrs} relevant years vs. a typical ${minY}–${maxY} — the company may see this level as a stretch.`)
  }

  // Offer vs. market
  const b = bench.base
  if (comp.base < b.median) {
    const gap = 1 - comp.base / b.median
    add('strength', 'Offer is below the estimated market midpoint', Math.round(clamp(6 + gap * 120, 6, 16)), `Base is ~${formatPercent(gap)} below the illustrative median (${k(b.median)}).`)
  } else if (comp.base >= b.p75) {
    add('weakness', 'Offer is already near the top of the estimated range', -8, `Base is at or above the illustrative 75th percentile (${k(b.p75)}), leaving less room.`)
  } else {
    add('weakness', 'Offer is above the estimated midpoint', -3, `Base is above the illustrative median (${k(b.median)}), so the market-data argument is softer.`)
  }

  // Role demand & expertise
  if (bench.demand === 'high') add('strength', 'Role is in high demand', 8, `${bench.roleFamilyLabel} roles are modeled as high-demand.`)
  else if (bench.demand === 'medium') add('strength', 'Role has steady demand', 4, `${bench.roleFamilyLabel} roles are modeled as steady-demand.`)
  if (uniqueExpertise) add('strength', 'You bring specialized expertise', 8, 'Skills that are hard to hire for are a legitimate basis for a stronger ask.')

  // Current situation
  const es = inputs.profile.employmentStatus
  if (es === 'employed') add('strength', 'You are currently employed', 6, 'You can compare against a known, stable alternative.')
  else if (es === 'unemployed') add('weakness', 'You are between roles', -5, 'Negotiating is still reasonable — just weigh timing and risk tolerance.')

  if (comp.changeVsCurrent !== undefined) {
    if (comp.changeVsCurrent < 0) add('strength', 'Offer is below your current package', 8, 'Asking to at least match what you earn today is a clear, reasonable request.')
    else if (comp.changeVsCurrent > 0.3) add('weakness', 'Offer is already a large increase', -4, `Total comp is ${formatPercent(comp.changeVsCurrent, 0, true)} vs. today; the company may see this as generous.`)
  }

  if (bandSignal === 'fixed') add('weakness', 'Company signaled a fixed compensation band', -8, 'Base may be constrained — signing bonus, equity or level are often better levers.')
  else if (bandSignal === 'flexible') add('strength', 'Company signaled flexibility', 6, 'An explicit signal of room is a good reason to make a clear ask.')

  const score = Math.round(clamp(LEVERAGE_BASELINE + f.reduce((a, x) => a + x.points, 0), 5, 97))
  const label: NegotiationLeverage['label'] = score >= 80 ? 'Very strong' : score >= 60 ? 'Strong' : score >= 40 ? 'Moderate' : 'Limited'
  f.sort((a, b2) => Math.abs(b2.points) - Math.abs(a.points))
  return { score, label, factors: f }
}

// ---------------------------------------------------------------------------
// Confidence — how well the inputs match what the benchmark model covers
// ---------------------------------------------------------------------------

const Q: Record<MatchQuality, number> = { high: 1, medium: 0.7, low: 0.4 }

export function calculateConfidence(inputs: EvaluationInputs): Confidence {
  const factors: (ConfidenceFactor & { weight: number })[] = []
  const push = (label: string, rating: MatchQuality, detail: string, weight: number) => factors.push({ label, rating, detail, weight })

  const role = inferRoleFamily(inputs.offer.role || inputs.profile.jobTitle)
  push('Role match', role.match,
    role.match === 'low' ? 'Title did not map to a modeled role family; a generic fallback was used.'
    : `Mapped to ${role.family.label}${role.match === 'medium' ? ' (partial keyword match)' : ''}.`, 2)

  const lvl = inputs.offer.level || inputs.profile.level
  push('Level match', lvl ? 'high' : 'medium', lvl ? `Benchmarked at ${LEVELS[lvl].label}.` : 'Level not provided; Senior assumed.', 1)

  const level = effectiveLevel(inputs)
  const [minY, maxY] = LEVELS[level].expectedYears
  const yrs = inputs.profile.yearsRelevant ?? inputs.profile.yearsExperience
  const expRating: MatchQuality = yrs === undefined ? 'medium' : yrs >= minY - 1 && yrs <= maxY + 2 ? 'high' : Math.abs(yrs - (minY + maxY) / 2) < 8 ? 'medium' : 'low'
  push('Experience match', expRating,
    yrs === undefined ? 'Years of experience not provided.' : `${yrs} relevant years vs. a typical ${minY}–${maxY} for this level.`, 1.5)

  const loc = resolveLocation(inputs.profile.location)
  push('Location match', inputs.profile.location ? loc.match : 'low',
    loc.match === 'high' ? `${loc.label} is a well-modeled market.` : `${loc.label} uses a broader regional adjustment.`, 1.5)

  const ind = resolveIndustry(inputs.profile.industry)
  push('Industry match', inputs.profile.industry ? ind.match : 'low',
    ind.match === 'high' ? `${ind.label} is well represented in the model.` : `${ind.label} has thinner modeled coverage.`, 1)

  const stage = inputs.offer.companyStage
  push('Company stage', stage === 'unknown' ? 'low' : 'high',
    stage === 'unknown' ? 'Stage not provided — equity and bonus norms are less certain.' : `${STAGES[stage].label}.`, 0.75)

  const o = inputs.offer
  const filled = [o.base, o.targetBonusPct, o.equityTotal].filter((v) => v !== undefined).length
  push('Offer completeness', filled === 3 ? 'high' : filled === 2 ? 'medium' : 'low',
    `${filled} of 3 core components provided (base, bonus, equity).`, 1)

  push('Benchmark freshness', 'low', 'Benchmarks are static, illustrative assumptions — not live market data.', 1.5)

  const wsum = factors.reduce((a, f) => a + f.weight, 0)
  const raw = factors.reduce((a, f) => a + Q[f.rating] * f.weight, 0) / wsum
  // Haircut for static data, and never present near-certainty.
  const score = Math.round(clamp(raw * 90, 20, 88))
  const label: MatchQuality = score >= 75 ? 'high' : score >= 55 ? 'medium' : 'low'
  return { score, label, factors: factors.map(({ weight: _w, ...rest }) => rest) }
}

/** Lower confidence → wider illustrative range. */
export function rangeWidening(confidence: Confidence): number {
  return 1 + clamp((85 - confidence.score) / 100, 0, 0.6) * 1.2
}
