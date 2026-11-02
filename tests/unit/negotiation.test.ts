import { describe, expect, it } from 'vitest'
import { analyzeOffer, counterTerms, evaluateCounter, runWhatIf } from '../../src/engine'
import { SAMPLE_PERSONA } from '../../src/data/samplePersona'
import type { CounterOffer, EvaluationInputs } from '../../src/types'

const inputs = () => structuredClone(SAMPLE_PERSONA) as EvaluationInputs
const { target, fallback } = analyzeOffer(inputs()).recommendation
const logged = (c: Partial<CounterOffer>): CounterOffer => ({ id: 'x', at: '2026-01-01', note: '', ...c })

describe('evaluateCounter', () => {
  it('suggests accepting when the target is met', () => {
    expect(evaluateCounter(inputs(), [], { base: target }).move).toBe('accept')
  })

  it('suggests closing between fallback and target', () => {
    expect(evaluateCounter(inputs(), [], { base: fallback }).move).toBe('close')
  })

  it('suggests a counter below the fallback, above the current number', () => {
    const e = evaluateCounter(inputs(), [], { base: fallback - 8_000 })
    expect(e.move).toBe('counter')
    expect(e.suggestedCounterBase).toBeGreaterThan(fallback - 8_000)
  })

  it('flags a response under the walk-away number', () => {
    const i = inputs()
    i.walkAway = 200_000
    expect(evaluateCounter(i, [], { base: 198_000 }).move).toBe('below_walk_away')
  })

  it('suggests pivoting when base barely moves across rounds', () => {
    const i = inputs()
    const log = [logged({ base: i.offer.base! + 2_000 })]
    expect(evaluateCounter(i, log, { base: i.offer.base! + 3_000 }).move).toBe('pivot')
  })

  it('carries earlier rounds forward for terms not mentioned again', () => {
    const terms = counterTerms(inputs(), [logged({ signingBonus: 20_000 })], { base: 205_000 })
    expect(terms.signingBonus).toBe(20_000)
    expect(terms.base).toBe(205_000)
  })
})

describe('runWhatIf', () => {
  it('reports the change in base', () => {
    const i = inputs()
    const r = runWhatIf(i, { base: i.offer.base! + 10_000 })
    expect(r.after.base - r.before.base).toBe(10_000)
  })
})
