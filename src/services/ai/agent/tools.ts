// Tools the coach can call. Every number comes from the deterministic engine;
// the model only decides which tool to call and explains the result.

import { evaluateCounter, runWhatIf, type OfferPatch } from '../../../engine'
import { k, parseAmount } from '../../../lib/format'
import type { CounterOffer } from '../../../types'
import type { CoachToolName, CoachWorkspace, ToolEvent } from './types'

export interface CoachTool {
  name: CoachToolName
  description: string
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] }
  /** Runs the tool; returns the event to show the user and compact data for the model. */
  run: (input: Record<string, unknown>, ws: CoachWorkspace) => { event: ToolEvent; result: unknown }
}

const money = (description: string) => ({ type: 'number', description })

const OFFER_FIELDS = {
  base: money('Annual base salary in dollars, e.g. 215000'),
  targetBonusPct: { type: 'number', description: 'Target bonus as a percent of base, e.g. 15' },
  signingBonus: money('One-time signing bonus in dollars'),
  equityTotal: money('Total equity grant value in dollars over the full vesting period'),
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
    name: 'run_what_if',
    description:
      'Re-runs CompPilot\'s scoring on a HYPOTHETICAL version of the offer and returns before/after numbers (offer score, base percentile, total comp, recommendation). Use for any "what if" question. Does not change the user\'s saved offer.',
    inputSchema: {
      type: 'object',
      properties: {
        ...OFFER_FIELDS,
        vestingYears: { type: 'number', description: 'Vesting period in years' },
        ptoDays: { type: 'number', description: 'Paid time off days per year' },
        competingBase: money('A different competing-offer base salary to test'),
      },
    },
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
    name: 'evaluate_counter_offer',
    description:
      'Evaluates terms the COMPANY offered (a counter-offer) against the original offer and the user\'s target, fallback and walk-away. Fields not given keep their latest known value. Returns the numbers plus a rule-based suggested next move (accept, close, counter, pivot or below_walk_away) with reasons and, when relevant, a suggested counter base.',
    inputSchema: { type: 'object', properties: OFFER_FIELDS },
    run: (input, ws) => {
      const terms = readTerms(input)
      if (!Object.keys(terms).length) throw new Error('Give at least one number from the company, such as base.')
      const e = evaluateCounter(ws.inputs, ws.counters, terms)
      return { event: { name: 'evaluate_counter_offer', label: `Evaluated their offer: ${termsLabel(terms)}`, evaluation: e }, result: e }
    },
  },
  {
    name: 'log_counter_offer',
    description:
      'Records a response the company ACTUALLY gave (as reported by the user) in the negotiation timeline, so later rounds build on it. Never use for hypotheticals or for the user\'s own asks. Call after evaluate_counter_offer.',
    inputSchema: {
      type: 'object',
      properties: { ...OFFER_FIELDS, note: { type: 'string', description: 'Short summary of what they said, e.g. "Recruiter call: top of band"' } },
      required: ['note'],
    },
    run: (input, ws) => {
      const terms = readTerms(input)
      if (!Object.keys(terms).length) throw new Error('Nothing to record: no numbers given.')
      const entry = ws.addCounter({ ...terms, note: String(input.note ?? '').slice(0, 200) })
      ws.counters = [...ws.counters, entry]
      return { event: { name: 'log_counter_offer', label: `Added to timeline: ${termsLabel(terms)}`, logged: entry }, result: { recorded: true, round: ws.counters.length } }
    },
  },
]
