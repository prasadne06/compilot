import type { NegotiationScript, PushbackScenario, ScriptChannel } from '../../types'
import { formatCurrency, k } from '../../lib/format'
import type { AIContext } from './context'
import { isObj, isStr, isStrArr, runTask, type AIResult } from './provider'

// ---------- shared phrasing helpers (all truthful, non-manipulative) ----------

function ask(c: AIContext, written = false): string {
  const n = written ? formatCurrency(c.target) : k(c.target)
  if (c.primaryAsk.includes('base')) return `get the base closer to ${n}`
  if (c.primaryAsk.includes('equity')) return 'increase the equity portion of the offer'
  if (c.primaryAsk.includes('Signing')) return 'add a signing bonus'
  return 'improve the overall package'
}

function competingLine(c: AIContext, written = false): string | undefined {
  const n = c.competing.base ? (written ? formatCurrency(c.competing.base) : k(c.competing.base)) : undefined
  switch (c.competing.kind) {
    case 'written':
      return n
        ? `I also want to be transparent that I have another written offer with a base of ${n}. ${c.company} is my preference, and I'd like to find a way to make this work.`
        : `I also want to be transparent that I have another written offer. ${c.company} is my preference, and I'd like to find a way to make this work.`
    case 'multiple':
      return `I want to be transparent that I'm weighing other offers${n ? `, including one at ${n} base` : ''}. This role is the one I'm most excited about.`
    case 'verbal':
      return `For context, I've also received a verbal offer elsewhere${n ? ` in the ${n} range` : ''}, though ${c.company} remains my first choice.`
    default:
      return undefined
  }
}

const experience = (c: AIContext) => (c.yearsRelevant !== undefined ? `${c.yearsRelevant} years of relevant experience` : 'my experience')

function mockScripts(c: AIContext): NegotiationScript[] {
  const comp = competingLine(c)
  const compW = competingLine(c, true)
  const role = c.role
  const scripts: Record<ScriptChannel, NegotiationScript> = {
    recruiter_call: {
      id: 'recruiter_call', title: 'Recruiter Call', format: 'spoken', tone: 'Warm & specific',
      whenToUse: 'Your first live conversation after receiving the offer.',
      body:
        `Thanks so much for sending the offer — I'm genuinely excited about the ${role} role and the team.\n\n` +
        `Before I sign, I wanted to talk through compensation. Based on the scope of the position, ${experience(c)}, and the range I'm seeing for comparable roles, I was hoping we could ${ask(c)}.` +
        (comp ? `\n\n${comp}` : '') +
        `\n\nIs there flexibility there?`,
      keyMoves: ['Lead with enthusiasm', 'One specific number', 'Short, grounded reason', 'End with an open question — then pause'],
    },
    email: {
      id: 'email', title: 'Email', format: 'written', tone: 'Professional & clear',
      whenToUse: 'When you prefer to put the ask in writing, or to follow up after a call.',
      subject: `${role} offer — a quick question on compensation`,
      body:
        `Hi [Recruiter name],\n\nThank you again for the offer. I've enjoyed getting to know the team, and I'm excited about the opportunity to join ${c.company} as ${role.match(/^[aeiou]/i) ? 'an' : 'a'} ${role}.\n\n` +
        `After reviewing the full package, I'd like to discuss the compensation. Given the scope of the role, ${experience(c)}, and what I'm seeing for comparable positions in ${c.location}, I'd like to ask whether we could ${ask(c, true)}.` +
        (compW ? `\n\n${compW}` : '') +
        `\n\nI'm confident I can make a strong impact here, and I'd love to find a package that works for both of us. Would you be open to a quick call this week?\n\nBest,\n[Your name]`,
      keyMoves: ['Clear subject line', 'Gratitude first', 'Exact number in writing', 'Invites a conversation rather than demanding'],
    },
    hiring_manager: {
      id: 'hiring_manager', title: 'Hiring Manager Conversation', format: 'spoken', tone: 'Collaborative & value-focused',
      whenToUse: 'If the hiring manager is involved, or the recruiter suggests looping them in.',
      body:
        `I'm really excited about what the team is building, and the problems we discussed are exactly the kind of work I want to be doing.\n\n` +
        `I wanted to share where I am on the offer. With ${experience(c)} and the scope we talked about, I was hoping to land closer to ${k(c.target)}. ` +
        `I'd love your help understanding whether there's room to get there — or what it would take${c.nonCashAsk ? `, and how you think about ${c.nonCashAsk.toLowerCase()} for this role` : ''}.`,
      keyMoves: ['Connect the ask to the work', 'Ask for their help, not a concession', c.nonCashAsk ? `Raise ${c.nonCashAsk.toLowerCase()}` : 'Stay curious about constraints'],
    },
    short: {
      id: 'short', title: 'Short & Direct', format: 'spoken', tone: 'Concise',
      whenToUse: 'When time is short or you prefer minimal framing.',
      body: `I'm excited about this offer and ready to move forward. If we can ${ask(c)}, I'd be glad to sign. Is that possible?`,
      keyMoves: ['Signals commitment', 'Conditional yes', 'Under 40 words'],
    },
    collaborative: {
      id: 'collaborative', title: 'Collaborative', format: 'spoken', tone: 'Problem-solving',
      whenToUse: 'When the relationship matters most, or they have hinted at constraints.',
      body:
        `I really want to make this work, and I'd like to approach it together. My goal is to land around ${k(c.target)} in total base — I understand there may be constraints, so I'm open to looking at the whole package.\n\n` +
        `If base is limited, could we look at ${c.secondaryAsk.toLowerCase()} or ${c.fallbackAsk.toLowerCase()} to close the gap? What options do you have on your side?`,
      keyMoves: ['Shared goal framing', 'Names the gap without blame', 'Offers alternative levers'],
    },
    assertive: {
      id: 'assertive', title: 'Assertive', format: 'spoken', tone: 'Confident, still respectful',
      whenToUse: c.leverageScore >= 60 ? 'Your leverage is strong — appropriate when you want a clear, firm ask.' : 'Use selectively; your leverage is moderate, so pair firmness with warmth.',
      body:
        `I'm excited about the role and want to be direct about what would make this an easy yes. Based on the scope, ${experience(c)}, and the market for comparable roles, I'm looking for a base of ${k(c.target)}.` +
        (comp ? ` ${comp}` : '') +
        `\n\nIf we can get there, I'm ready to accept.`,
      keyMoves: ['States the number as a requirement for a yes', 'Grounds it in facts', 'No threats or ultimatums'],
    },
  }
  return Object.values(scripts)
}

const isScripts = (v: unknown): v is { scripts: NegotiationScript[] } =>
  isObj(v) && Array.isArray(v.scripts) && v.scripts.every((s) => isObj(s) && isStr(s.id) && isStr(s.body) && isStr(s.title) && isStrArr(s.keyMoves))

export async function generateScripts(ctx: AIContext): Promise<AIResult<NegotiationScript[]>> {
  const r = await runTask('script_generation', ctx, { mock: () => ({ scripts: mockScripts(ctx) }), validate: isScripts, latencyMs: 1200 })
  return { ...r, data: r.data.scripts }
}

// ---------- Pushback ----------

function mockPushback(c: AIContext): PushbackScenario[] {
  const signing = Math.max(5_000, Math.round((c.target - c.offerBase) / 5_000) * 5_000)
  return [
    {
      id: 'cant_increase_base',
      objection: '"We can\'t increase the base."',
      response: `I understand, and I appreciate you checking. Since base is fixed, could we look at a signing bonus of around ${k(signing)} to help bridge the gap in the first year?`,
      alternativeAsk: `Signing bonus (~${k(signing)}) or additional equity`,
      rationale: 'One-time payments often come from a different budget than recurring salary, so they can be easier to approve.',
    },
    {
      id: 'band_fixed',
      objection: '"The salary band is fixed."',
      response: `That makes sense. Could you share where in the band this offer sits? If it isn't at the top, I'd love to get closer to it. If it is, I'd like to explore whether the scope supports ${c.levelLabel === 'Senior' ? 'the next level' : 'a different level'} or an early compensation review.`,
      alternativeAsk: 'Top of band, a level review, or a written 6-month comp review',
      rationale: 'Bands constrain base, but placement within the band, the level itself, and review timing are often negotiable.',
    },
    {
      id: 'equity_instead',
      objection: '"We can increase equity instead."',
      response: `I appreciate that — equity is meaningful to me. Could you share the details: the number of ${c.equityLiquid ? 'units' : 'shares or options'}, current valuation, and vesting schedule? I'd like to understand how it compares before deciding.`,
      alternativeAsk: 'A larger equity increase, or a split between equity and a smaller base bump',
      rationale: c.equityLiquid
        ? 'Public equity is closer to cash, but its value still moves with the stock price.'
        : 'Private equity can be valuable but is illiquid and uncertain — understand the terms before trading cash for it.',
    },
    {
      id: 'budget',
      objection: '"We need to stay within our budget."',
      response: `Totally understood. Is there anything outside the salary budget we could look at — for example a signing bonus, ${c.nonCashAsk ? c.nonCashAsk.toLowerCase() : 'additional PTO'}, or a review at six months?`,
      alternativeAsk: c.nonCashAsk ?? 'Additional PTO or an early review',
      rationale: 'Shifting to items funded from other budgets keeps the conversation productive without pushing on a hard constraint.',
    },
    {
      id: 'best_offer',
      objection: '"We already gave you our best offer."',
      response: `Thank you for being clear. I'm still very interested. Before I make a decision, would it be possible to revisit ${c.fallbackAsk.toLowerCase()} — even a modest change would make this an easier yes for me.`,
      alternativeAsk: `${c.fallbackAsk} at a modest level, or take time to decide`,
      rationale: '"Best offer" is sometimes final and sometimes not. A small, specific request is low-risk — and if it is final, you can decide with clarity.',
    },
  ]
}

const isPushback = (v: unknown): v is { scenarios: PushbackScenario[] } =>
  isObj(v) && Array.isArray(v.scenarios) && v.scenarios.every((s) => isObj(s) && isStr(s.objection) && isStr(s.response) && isStr(s.alternativeAsk) && isStr(s.rationale))

export async function generatePushback(ctx: AIContext): Promise<AIResult<PushbackScenario[]>> {
  const r = await runTask('pushback_scenarios', ctx, { mock: () => ({ scenarios: mockPushback(ctx) }), validate: isPushback, latencyMs: 900 })
  return { ...r, data: r.data.scenarios }
}
