import { describe, expect, it } from 'vitest'
import { analyzeOffer, buildBenchmark, inferRoleFamily, isReadyForAnalysis, validateOffer } from '../../src/engine'
import { SAMPLE_PERSONA } from '../../src/data/samplePersona'
import type { EvaluationInputs } from '../../src/types'

const sample = () => structuredClone(SAMPLE_PERSONA) as EvaluationInputs

describe('analyzeOffer (sample persona)', () => {
  // These numbers are what the landing page and README show. A change here is a product change.
  const a = analyzeOffer(sample())

  it('keeps the published sample results', () => {
    expect(a.offerScore.score).toBe(72)
    expect(a.leverage.score).toBe(77)
    expect(a.confidence.score).toBe(82)
    expect(a.recommendation.target).toBe(215_000)
    expect(a.recommendation.rangeLow).toBe(210_000)
    expect(a.recommendation.rangeHigh).toBe(220_000)
    expect(a.recommendation.fallback).toBe(205_000)
  })

  it('labels the benchmark as illustrative', () => {
    expect(a.benchmark.source).toBe('illustrative')
  })

  it('orders the market range', () => {
    const r = a.benchmark.base
    expect(r.low).toBeLessThan(r.p25)
    expect(r.p25).toBeLessThan(r.median)
    expect(r.median).toBeLessThan(r.p75)
    expect(r.p75).toBeLessThan(r.high)
  })
})

describe('engine behaviour', () => {
  it('is deterministic', () => {
    expect(analyzeOffer(sample())).toEqual(analyzeOffer(sample()))
  })

  it('scores a higher base at least as well', () => {
    const lo = sample()
    const hi = sample()
    hi.offer.base = lo.offer.base! + 30_000
    expect(analyzeOffer(hi).offerScore.score).toBeGreaterThanOrEqual(analyzeOffer(lo).offerScore.score)
  })

  it('a competing offer does not lower leverage', () => {
    const without = sample()
    without.leverage.competing = { company: '' }
    expect(analyzeOffer(sample()).leverage.score).toBeGreaterThanOrEqual(analyzeOffer(without).leverage.score)
  })

  it('widens the range when confidence is lower', () => {
    const narrow = buildBenchmark(sample(), 1).base
    const wide = buildBenchmark(sample(), 1.5).base
    expect(wide.high - wide.low).toBeGreaterThan(narrow.high - narrow.low)
    expect(wide.median).toBe(narrow.median)
  })

  it('matches role families by the longest keyword', () => {
    expect(inferRoleFamily('Senior Design Manager').family.id).toBe('design_mgmt')
    expect(inferRoleFamily('Staff Software Engineer').family.id).toBe('swe')
    expect(inferRoleFamily('Underwater basket weaver').match).toBe('low')
  })

  it('requires a base salary before analysis', () => {
    const i = sample()
    i.offer.base = 0
    expect(validateOffer(i).valid).toBe(false)
    expect(isReadyForAnalysis(i)).toBe(false)
  })
})
