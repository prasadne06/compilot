// Names, descriptions and input schemas of the coach's tools. No imports, so the server
// (which runs outside the Vite build) can share them. The browser runs the tools themselves,
// with CompPilot's own calculations; see tools.ts.

export type CoachToolName = 'run_what_if' | 'evaluate_counter_offer' | 'log_counter_offer'

export interface CoachToolSpec {
  name: CoachToolName
  description: string
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] }
}

const money = (description: string) => ({ type: 'number', description })

const OFFER_FIELDS = {
  base: money('Annual base salary in dollars, e.g. 215000'),
  targetBonusPct: { type: 'number', description: 'Target bonus as a percent of base, e.g. 15' },
  signingBonus: money('One-time signing bonus in dollars'),
  equityTotal: money('Total equity grant value in dollars over the full vesting period'),
}

export const COACH_TOOL_SPECS: Record<CoachToolName, CoachToolSpec> = {
  run_what_if: {
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
  },
  evaluate_counter_offer: {
    name: 'evaluate_counter_offer',
    description:
      'Evaluates terms the COMPANY offered (a counter-offer) against the original offer and the user\'s target, fallback and walk-away. Fields not given keep their latest known value. Returns the numbers plus a rule-based suggested next move (accept, close, counter, pivot or below_walk_away) with reasons and, when relevant, a suggested counter base. Set isNewResponse to false to re-check the latest response already in the timeline.',
    inputSchema: {
      type: 'object',
      properties: {
        ...OFFER_FIELDS,
        isNewResponse: { type: 'boolean', description: 'true (default) for a new response not yet in the timeline; false to re-evaluate the latest logged response' },
      },
    },
  },
  log_counter_offer: {
    name: 'log_counter_offer',
    description:
      'Records a response the company ACTUALLY gave (as reported by the user) in the negotiation timeline, so later rounds build on it. Never use for hypotheticals or for the user\'s own asks. Call after evaluate_counter_offer.',
    inputSchema: {
      type: 'object',
      properties: { ...OFFER_FIELDS, note: { type: 'string', description: 'Short summary of what they said, e.g. "Recruiter call: top of band"' } },
      required: ['note'],
    },
  },
}
