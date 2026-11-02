// Tools the coach can call. Every number comes from the deterministic engine;
// the model only decides which tool to call and explains the result.

import { evaluateCounter, runWhatIf, type OfferPatch } from '../../../engine'
import { k, parseAmount } from '../../../lib/format'
import type { CounterOffer } from '../../../types'
import type { CoachWorkspace, ToolEvent } from './types'
import { COACH_TOOL_SPECS, type CoachToolSpec } from './toolSpecs'

export interface CoachTool extends CoachToolSpec {
  /** Runs the tool; returns the event to show the user and compact data for the model. */
  run: (input: Record<string, unknown>, ws: CoachWorkspace) => { event: ToolEvent; result: unknown }
}

function readTerms(input: Record<string, unknown>): Omit<CounterOffer, 'id' | 'at' | 'note'> {
  const out: Omit<CounterOffer, 'id' | 'at' | 'note'> = {}
  const base = parseAmount(input.base)
  const pct = parseAmount(input.targetBonusPct)
  const signing = parseAmount(input.signingBonus)
  const equity = parseAmount(input.equityTotal)
  if (base !== undefined && base >= 10_000) out.base = base
  if (pct !== undefined && pct >= 0 && pct <= 200) out.targetBonusPct = pct
  if (signing !== undefined && signing >= 0) out.signingBonus = signing
  if (equity !== undefined && equity >= 0) out.equityTotal = equity
  return out
}

function termsLabel(t: Omit<CounterOffer, 'id' | 'at' | 'note'>): string {
  const parts: string[] = []
  if (t.base !== undefined) parts.push(`base ${k(t.base)}`)
  if (t.signingBonus !== undefined) parts.push(`signing ${k(t.signingBonus)}`)
  if (t.equityTotal !== undefined) parts.push(`equity ${k(t.equityTotal)}`)
  if (t.targetBonusPct !== undefined) parts.push(`bonus ${t.targetBonusPct}%`)
  return parts.join(', ')
}

export const COACH_TOOLS: CoachTool[] = [
  {
    ...COACH_TOOL_SPECS.run_what_if,
    run: (input, ws) => {
      const patch: OfferPatch = { ...readTerms(input) }
      const vest = parseAmount(input.vestingYears)
      const pto = parseAmount(input.ptoDays)
      if (vest !== undefined && vest > 0 && vest <= 10) patch.vestingYears = vest
      if (pto !== undefined && pto >= 0 && pto <= 90) patch.ptoDays = pto
      const competingBase = parseAmount(input.competingBase)
      if (!Object.keys(patch).length && competingBase === undefined) throw new Error('Give at least one number to change, such as base.')
      const r = runWhatIf(ws.inputs, patch, competingBase !== undefined ? { competingBase } : {})
      return { event: { name: 'run_what_if', label: `What-if: ${r.changes.join(', ')}`, whatIf: r }, result: r }
    },
  },
  {
    ...COACH_TOOL_SPECS.evaluate_counter_offer,
    run: (input, ws) => {
      const terms = readTerms(input)
      if (!Object.keys(terms).length) throw new Error('Give at least one number from the company, such as base.')
      // Re-checking the latest logged response must not count it twice
      const prior = input.isNewResponse === false ? ws.counters.slice(0, -1) : ws.counters
      const e = evaluateCounter(ws.inputs, prior, terms)
      return { event: { name: 'evaluate_counter_offer', label: `Evaluated their offer: ${termsLabel(terms)}`, evaluation: e }, result: e }
    },
  },
  {
    ...COACH_TOOL_SPECS.log_counter_offer,
    run: (input, ws) => {
      const terms = readTerms(input)
      if (!Object.keys(terms).length) throw new Error('Nothing to record: no numbers given.')
      const entry = ws.addCounter({ ...terms, note: String(input.note ?? '').slice(0, 200) })
      ws.counters = [...ws.counters, entry]
      return { event: { name: 'log_counter_offer', label: `Added to timeline: ${termsLabel(terms)}`, logged: entry }, result: { recorded: true, round: ws.counters.length } }
    },
  },
]
