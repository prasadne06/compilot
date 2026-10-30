import type { Analysis, CounterEvaluation, CounterOffer, EvaluationInputs, WhatIfResult } from '../../../types'

export type CoachToolName = 'run_what_if' | 'evaluate_counter_offer' | 'log_counter_offer'

/** One tool call the coach made, shown to the user so they can see where numbers came from. */
export interface ToolEvent {
  name: CoachToolName
  label: string
  whatIf?: WhatIfResult
  evaluation?: CounterEvaluation
  logged?: CounterOffer
}

export interface CoachMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  tools?: ToolEvent[]
  status?: 'thinking' | 'streaming' | 'done' | 'stopped' | 'error'
  error?: string
  engine?: CoachEngine
}

export type CoachEngine = 'claude' | 'offline'

/** What the coach's tools can see and do. Counters is a live copy so later tool calls see earlier ones. */
export interface CoachWorkspace {
  inputs: EvaluationInputs
  analysis: Analysis
  counters: CounterOffer[]
  addCounter: (c: Omit<CounterOffer, 'id' | 'at'>) => CounterOffer
}

export interface CoachCallbacks {
  onText: (text: string) => void
  onTool: (event: ToolEvent) => void
}
