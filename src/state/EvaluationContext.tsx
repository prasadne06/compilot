import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Analysis, EvaluationInputs, LeverageInputs, Offer, Priority, UserProfile } from '../types'
import { EMPTY_INPUTS, SAMPLE_PERSONA } from '../data/samplePersona'
import { analyzeOffer, isReadyForAnalysis } from '../engine'
import { buildAIContext, type AIContext } from '../services/ai'

const STORAGE_KEY = 'comppilot:inputs:v1'

function load(): { inputs: EvaluationInputs; isSample: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { inputs: EvaluationInputs; isSample: boolean }
      // Merge with defaults so older saved shapes don't break the app
      const i = parsed.inputs
      return {
        isSample: !!parsed.isSample,
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
  return { inputs: EMPTY_INPUTS, isSample: false }
}

interface EvaluationState {
  inputs: EvaluationInputs
  isSample: boolean
  ready: boolean
  analysis: Analysis | null
  aiContext: AIContext | null
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

  const patch = useCallback((fn: (i: EvaluationInputs) => EvaluationInputs, keepSample = false) => {
    setState((s) => ({ inputs: fn(s.inputs), isSample: keepSample ? s.isSample : false }))
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
    updateProfile: (p) => patch((i) => ({ ...i, profile: { ...i.profile, ...p } })),
    updateOffer: (p) => patch((i) => ({ ...i, offer: { ...i.offer, ...p } })),
    updateLeverage: (p) => patch((i) => ({ ...i, leverage: { ...i.leverage, ...p } })),
    setPriorities: (p) => patch((i) => ({ ...i, priorities: p })),
    setWalkAway: (v) => patch((i) => ({ ...i, walkAway: v }), true),
    loadSample: () => setState({ inputs: structuredClone(SAMPLE_PERSONA), isSample: true }),
    reset: () => setState({ inputs: structuredClone(EMPTY_INPUTS), isSample: false }),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEvaluation(): EvaluationState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useEvaluation must be used inside EvaluationProvider')
  return v
}
