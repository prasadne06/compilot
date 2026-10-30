import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Analysis, AutofillKey, AutofillState, EvaluationInputs, ExtractedField, LeverageInputs, Offer, Priority, UserProfile } from '../types'
import { EMPTY_INPUTS, SAMPLE_PERSONA } from '../data/samplePersona'
import { analyzeOffer, isReadyForAnalysis } from '../engine'
import { buildAIContext, type AIContext } from '../services/ai'

const STORAGE_KEY = 'comppilot:inputs:v1'

interface Stored {
  inputs: EvaluationInputs
  isSample: boolean
  autofill: AutofillState | null
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
        autofill: parsed.autofill ?? null,
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
  return { inputs: EMPTY_INPUTS, isSample: false, autofill: null }
}

interface EvaluationState {
  inputs: EvaluationInputs
  isSample: boolean
  ready: boolean
  analysis: Analysis | null
  aiContext: AIContext | null
  autofill: AutofillState | null
  applyAutofill: (fileName: string, fields: ExtractedField[], pendingKeys: AutofillKey[]) => void
  confirmAutofill: (keys?: AutofillKey[]) => void
  updateProfile: (patch: Partial<UserProfile>) => void
  updateOffer: (patch: Partial<Offer>) => void
  updateLeverage: (patch: Partial<LeverageInputs>) => void
  setPriorities: (p: Priority[]) => void
  setWalkAway: (v: number | undefined) => void
  loadSample: () => void
  reset: () => void
}

const Ctx = createContext<EvaluationState | null>(null)

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
    applyAutofill: (fileName, fields, pendingKeys) =>
      setState((s) => {
        const profile = { ...s.inputs.profile }
        const offer = { ...s.inputs.offer }
        for (const f of fields) {
          const [section, prop] = f.key.split('.') as ['profile' | 'offer', string]
          ;(section === 'profile' ? (profile as Record<string, unknown>) : (offer as Record<string, unknown>))[prop] = f.value
        }
        const keys = fields.map((f) => f.key)
        return { inputs: { ...s.inputs, profile, offer }, isSample: false, autofill: { fileName, filledKeys: keys, pendingKeys } }
      }),
    confirmAutofill: (keys) =>
      setState((s) => (s.autofill ? { ...s, autofill: { ...s.autofill, pendingKeys: keys ? s.autofill.pendingKeys.filter((k) => !keys.includes(k)) : [] } } : s)),
    updateProfile: (p) => patch((i) => ({ ...i, profile: { ...i.profile, ...p } }), false, Object.keys(p).map((k) => `profile.${k}`)),
    updateOffer: (p) => patch((i) => ({ ...i, offer: { ...i.offer, ...p } }), false, Object.keys(p).map((k) => `offer.${k}`)),
    updateLeverage: (p) => patch((i) => ({ ...i, leverage: { ...i.leverage, ...p } })),
    setPriorities: (p) => patch((i) => ({ ...i, priorities: p })),
    setWalkAway: (v) => patch((i) => ({ ...i, walkAway: v }), true),
    loadSample: () => setState({ inputs: structuredClone(SAMPLE_PERSONA), isSample: true, autofill: null }),
    reset: () => setState({ inputs: structuredClone(EMPTY_INPUTS), isSample: false, autofill: null }),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEvaluation(): EvaluationState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useEvaluation must be used inside EvaluationProvider')
  return v
}
