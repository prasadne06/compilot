import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Analysis, AutofillKey, AutofillState, CounterOffer, EvaluationInputs, LeverageInputs, Offer, OfferExtraction, Priority, UserProfile } from '../types'
import { AUTOFILL_FIELDS } from '../data/autofillFields'
import { EMPTY_INPUTS, SAMPLE_PERSONA } from '../data/samplePersona'
import { analyzeOffer, counterTerms, isReadyForAnalysis } from '../engine'
import { buildAIContext, type AIContext } from '../services/ai'

const STORAGE_KEY = 'comppilot:inputs:v1'

interface Stored {
  inputs: EvaluationInputs
  isSample: boolean
  autofill: AutofillState | null
  counters: CounterOffer[] // the company's responses during the negotiation
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Stored> & { inputs: EvaluationInputs }
      // Merge with defaults so older saved shapes don't break the app
      const i = parsed.inputs
      return {
        isSample: !!parsed.isSample,
        counters: parsed.counters ?? [],
        // Older saved shapes lack sources/warnings
        autofill: parsed.autofill ? { ...parsed.autofill, sources: parsed.autofill.sources ?? {}, warnings: parsed.autofill.warnings ?? [] } : null,
        inputs: {
          profile: { ...EMPTY_INPUTS.profile, ...i.profile },
          offer: { ...EMPTY_INPUTS.offer, ...i.offer },
          leverage: { ...EMPTY_INPUTS.leverage, ...i.leverage, competing: { ...EMPTY_INPUTS.leverage.competing, ...i.leverage?.competing } },
          priorities: i.priorities ?? [],
          walkAway: i.walkAway,
        },
      }
    }
  } catch {
    /* storage unavailable or corrupt — start fresh */
  }
  return { inputs: EMPTY_INPUTS, isSample: false, autofill: null, counters: [] }
}

interface EvaluationState {
  inputs: EvaluationInputs
  isSample: boolean
  ready: boolean
  analysis: Analysis | null
  aiContext: AIContext | null
  autofill: AutofillState | null
  applyAutofill: (fileName: string, extraction: OfferExtraction) => void
  confirmAutofill: (keys?: AutofillKey[]) => void
  clearAutofilledField: (key: AutofillKey) => void
  updateProfile: (patch: Partial<UserProfile>) => void
  updateOffer: (patch: Partial<Offer>) => void
  updateLeverage: (patch: Partial<LeverageInputs>) => void
  setPriorities: (p: Priority[]) => void
  setWalkAway: (v: number | undefined) => void
  loadSample: () => void
  reset: () => void
  counters: CounterOffer[]
  addCounter: (c: Omit<CounterOffer, 'id' | 'at'>) => CounterOffer
  removeCounter: (id: string) => void
  /** Makes the latest negotiated terms the offer being evaluated, and clears the log. */
  adoptLatestTerms: () => void
}

const Ctx = createContext<EvaluationState | null>(null)

function setField(inputs: EvaluationInputs, key: AutofillKey, value: unknown): EvaluationInputs {
  const [section, prop] = key.split('.') as ['profile' | 'offer', string]
  return { ...inputs, [section]: { ...inputs[section], [prop]: value } }
}

function emptyValue(key: AutofillKey): unknown {
  if (key === 'offer.companyStage') return 'unknown'
  return ['money', 'percent', 'number'].includes(AUTOFILL_FIELDS[key].kind) ? undefined : ''
}

export function EvaluationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  const patch = useCallback((fn: (i: EvaluationInputs) => EvaluationInputs, keepSample = false, touched: string[] = []) => {
    setState((s) => ({
      ...s,
      inputs: fn(s.inputs),
      isSample: keepSample ? s.isSample : false,
      // Editing an autofilled field counts as checking it
      autofill: s.autofill && touched.length ? { ...s.autofill, pendingKeys: s.autofill.pendingKeys.filter((key) => !touched.includes(key)) } : s.autofill,
    }))
  }, [])

  const ready = isReadyForAnalysis(state.inputs)
  const analysis = useMemo(() => (ready ? analyzeOffer(state.inputs) : null), [ready, state.inputs])
  const aiContext = useMemo(() => (analysis ? buildAIContext(state.inputs, analysis) : null), [analysis, state.inputs])

  const value: EvaluationState = {
    inputs: state.inputs,
    isSample: state.isSample,
    ready,
    analysis,
    aiContext,
    autofill: state.autofill,
    applyAutofill: (fileName, { fields, warnings }) =>
      setState((s) => {
        let inputs = s.inputs
        // Replacing a file: clear values the previous file filled that this one doesn't mention
        const incoming = new Set(fields.map((f) => f.key))
        for (const k of s.autofill?.filledKeys ?? []) if (!incoming.has(k)) inputs = setField(inputs, k, emptyValue(k))
        const sources: AutofillState['sources'] = {}
        for (const f of fields) {
          inputs = setField(inputs, f.key, f.value)
          sources[f.key] = { evidence: f.evidence, confidence: f.confidence, note: f.note }
        }
        const keys = fields.map((f) => f.key)
        // Every filled value starts unconfirmed; the user confirms it on the form
        return { ...s, inputs, isSample: false, autofill: { fileName, filledKeys: keys, pendingKeys: keys, sources, warnings } }
      }),
    clearAutofilledField: (key) =>
      setState((s) => ({
        ...s,
        inputs: setField(s.inputs, key, emptyValue(key)),
        autofill: s.autofill
          ? { ...s.autofill, filledKeys: s.autofill.filledKeys.filter((k) => k !== key), pendingKeys: s.autofill.pendingKeys.filter((k) => k !== key) }
          : null,
      })),
    confirmAutofill: (keys) =>
      setState((s) => (s.autofill ? { ...s, autofill: { ...s.autofill, pendingKeys: keys ? s.autofill.pendingKeys.filter((k) => !keys.includes(k)) : [] } } : s)),
    updateProfile: (p) => patch((i) => ({ ...i, profile: { ...i.profile, ...p } }), false, Object.keys(p).map((k) => `profile.${k}`)),
    updateOffer: (p) => patch((i) => ({ ...i, offer: { ...i.offer, ...p } }), false, Object.keys(p).map((k) => `offer.${k}`)),
    updateLeverage: (p) => patch((i) => ({ ...i, leverage: { ...i.leverage, ...p } })),
    setPriorities: (p) => patch((i) => ({ ...i, priorities: p })),
    setWalkAway: (v) => patch((i) => ({ ...i, walkAway: v }), true),
    loadSample: () => setState({ inputs: structuredClone(SAMPLE_PERSONA), isSample: true, autofill: null, counters: [] }),
    reset: () => setState({ inputs: structuredClone(EMPTY_INPUTS), isSample: false, autofill: null, counters: [] }),
    counters: state.counters,
    addCounter: (c) => {
      const entry: CounterOffer = { ...c, id: Math.random().toString(36).slice(2, 10), at: new Date().toISOString() }
      setState((s) => ({ ...s, counters: [...s.counters, entry] }))
      return entry
    },
    removeCounter: (id) => setState((s) => ({ ...s, counters: s.counters.filter((c) => c.id !== id) })),
    adoptLatestTerms: () =>
      setState((s) => {
        if (!s.counters.length) return s
        const terms = counterTerms(s.inputs, s.counters.slice(0, -1), s.counters[s.counters.length - 1])
        return { ...s, inputs: { ...s.inputs, offer: { ...s.inputs.offer, ...terms } }, counters: [] }
      }),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEvaluation(): EvaluationState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useEvaluation must be used inside EvaluationProvider')
  return v
}
