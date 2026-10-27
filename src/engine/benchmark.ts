import type { Benchmark, EvaluationInputs, JobLevel, MarketRange, MatchQuality } from '../types'
import {
  GENERIC_ROLE, INDUSTRIES, LEVELS, LOCATIONS, ROLE_FAMILIES, SPREAD, STAGES,
  type IndustryInfo, type LocationInfo, type RoleFamily,
} from '../data/benchmarks'
import { clamp } from '../lib/format'

export function inferRoleFamily(title: string): { family: RoleFamily; match: MatchQuality } {
  const t = ` ${title.toLowerCase().trim()} `
  if (!t.trim()) return { family: GENERIC_ROLE, match: 'low' }
  // Exact family label match
  const byLabel = ROLE_FAMILIES.find((r) => r.label.toLowerCase() === title.toLowerCase().trim())
  if (byLabel) return { family: byLabel, match: 'high' }
  // Longest keyword wins (so "design manager" beats "design")
  let best: { family: RoleFamily; len: number } | undefined
  for (const fam of ROLE_FAMILIES) {
    for (const kw of fam.keywords) {
      if (t.includes(kw) && (!best || kw.length > best.len)) best = { family: fam, len: kw.length }
    }
  }
  if (!best) return { family: GENERIC_ROLE, match: 'low' }
  return { family: best.family, match: best.len >= 8 ? 'high' : 'medium' }
}

export function resolveLocation(id: string): LocationInfo {
  return LOCATIONS.find((l) => l.id === id) ?? LOCATIONS.find((l) => l.id === 'other_us')!
}

export function resolveIndustry(id: string): IndustryInfo {
  return INDUSTRIES.find((i) => i.id === id) ?? INDUSTRIES.find((i) => i.id === 'other')!
}

export function effectiveLevel(inputs: EvaluationInputs): JobLevel {
  return (inputs.offer.level || inputs.profile.level || 'senior') as JobLevel
}

/** Experience adjustment within a level: ±~1.2% per year from the level's midpoint, capped. */
export function experienceAdjustment(level: JobLevel, years: number | undefined): number {
  if (years === undefined) return 0
  const [min, max] = LEVELS[level].expectedYears
  const mid = (min + max) / 2
  return clamp((years - mid) * 0.012, -0.08, 0.06)
}

function buildRange(median: number, widen: number): MarketRange {
  const s = (f: number) => median * (1 + (f - 1) * widen)
  return { low: s(SPREAD.low), p25: s(SPREAD.p25), median, p75: s(SPREAD.p75), high: s(SPREAD.high) }
}

/**
 * Builds an illustrative benchmark. `widen` (>=1) stretches the percentile spread
 * when confidence is lower, so uncertainty is expressed as a wider range rather than
 * false precision.
 */
export function buildBenchmark(inputs: EvaluationInputs, widen = 1): Benchmark {
  const title = inputs.offer.role || inputs.profile.jobTitle
  const { family, match: roleMatch } = inferRoleFamily(title)
  const level = effectiveLevel(inputs)
  const levelInfo = LEVELS[level]
  const loc = resolveLocation(inputs.profile.location)
  const ind = resolveIndustry(inputs.profile.industry)
  const stage = STAGES[inputs.offer.companyStage]
  const years = inputs.profile.yearsRelevant ?? inputs.profile.yearsExperience
  const expAdj = experienceAdjustment(level, years)

  const baseMedian = family.referenceBase * levelInfo.multiplier * loc.factor * ind.factor * stage.baseFactor * (1 + expAdj)
  const typicalBonusPct = ind.bonusPct * stage.bonusAdj
  const typicalEquityAnnual = baseMedian * stage.equityRatio * levelInfo.equityMultiplier

  const base = buildRange(baseMedian, widen)
  const tcMedian = baseMedian * (1 + typicalBonusPct) + typicalEquityAnnual
  const totalComp = buildRange(tcMedian, widen * 1.15) // TC varies more than base

  const pct = (n: number) => `${n >= 0 ? '+' : ''}${Math.round(n * 100)}%`

  return {
    roleFamily: family.id,
    roleFamilyLabel: family.label,
    roleMatch,
    level,
    locationLabel: loc.label,
    locationMatch: loc.match,
    industryLabel: ind.label,
    industryMatch: ind.match,
    stageLabel: stage.label,
    base,
    totalComp,
    typicalBonusPct,
    typicalEquityAnnual,
    demand: family.demand,
    source: 'illustrative',
    methodology: [
      `Role family: ${family.label} (reference median for Senior level)`,
      `Level: ${levelInfo.label} (×${levelInfo.multiplier.toFixed(2)})`,
      `Location: ${loc.label} (×${loc.factor.toFixed(2)})`,
      `Industry: ${ind.label} (×${ind.factor.toFixed(2)})`,
      `Company stage: ${stage.label} (×${stage.baseFactor.toFixed(2)})`,
      `Experience adjustment within level: ${pct(expAdj)}`,
      `Total comp assumes a ~${Math.round(typicalBonusPct * 100)}% target bonus and typical equity for this stage and level`,
    ],
  }
}
