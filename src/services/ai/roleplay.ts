import type { PracticeScenarioId, PracticeSession, ResponseFeedback } from '../../types'
import { clamp, k } from '../../lib/format'
import type { AIContext } from './context'
import { RISKY_USER_PATTERNS } from './guardrails'
import { isObj, isStr, runTask, type AIResult } from './provider'

export const PRACTICE_SCENARIOS: { id: PracticeScenarioId; title: string; description: string; difficulty: 'Easier' | 'Moderate' | 'Harder' }[] = [
  { id: 'top_of_range', title: 'Top of the range', description: 'The recruiter says the offer is already at the top of the range.', difficulty: 'Moderate' },
  { id: 'equity_instead', title: 'Equity instead', description: 'They can’t move base, but offer more equity.', difficulty: 'Easier' },
  { id: 'fixed_band', title: 'Fixed band', description: 'They say salary bands are fixed for the level.', difficulty: 'Moderate' },
  { id: 'best_offer', title: 'Best and final', description: 'They say this is already their best offer.', difficulty: 'Harder' },
]

export function openingLine(scenario: PracticeScenarioId, c: AIContext): string {
  switch (scenario) {
    case 'top_of_range':
      return `We're really excited to have you join us. Unfortunately, ${k(c.offerBase)} is already at the top of our salary range for this role.`
    case 'equity_instead':
      return `Thanks for raising compensation. We're not able to move much on base, but we could look at increasing your equity instead. Would that work for you?`
    case 'fixed_band':
      return `I want to be upfront: our salary bands are fixed for each level, so there isn't really room on base for this position.`
    case 'best_offer':
      return `We put a lot of thought into this package based on your experience. Honestly, this is already our best offer.`
  }
}

export function startSession(scenario: PracticeScenarioId, c: AIContext): PracticeSession {
  return { scenario, turns: [{ role: 'recruiter', text: openingLine(scenario, c) }], round: 0, maxRounds: 3, complete: false }
}

// ---------- Mock coach ----------

function parseAmounts(text: string): number[] {
  const out: number[] = []
  const re = /\$?\s?(\d{2,3}(?:,\d{3})+|\d{2,3}(?:\.\d)?\s?[kK]\b|\d{5,7})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const raw = m[1].replace(/[,\s$]/g, '')
    const n = /k$/i.test(raw) ? parseFloat(raw) * 1000 : parseFloat(raw)
    if (n >= 10_000 && n <= 5_000_000) out.push(n)
  }
  return out
}

interface Analysis {
  feedback: ResponseFeedback
  flags: { anchored: boolean; altAsk: boolean; ultimatum: boolean; amount?: number }
}

function coach(text: string, c: AIContext, round: number): Analysis {
  const t = text.trim()
  const words = t.split(/\s+/).filter(Boolean).length
  const lower = t.toLowerCase()
  const amounts = parseAmounts(t)
  const amount = amounts.length ? Math.max(...amounts) : undefined

  const strengths: string[] = []
  const improvements: string[] = []
  let score = 5

  const positive = /(excited|thank|appreciate|enthusias|looking forward|great fit|love to|really want)/.test(lower)
  const rationale = /(experience|market|scope|background|comparable|impact|responsibilit|skills|track record|data)/.test(lower)
  const collaborative = /\?|(is there|could we|would it be possible|what flexibility|how might|open to|work together|find a way)/.test(lower)
  const altAsk = /(equity|signing|sign-on|sign on|bonus|rsu|stock|review|pto|level|title)/.test(lower)
  const apologetic = RISKY_USER_PATTERNS.apologetic.test(t)
  const hedging = RISKY_USER_PATTERNS.hedging.test(t)
  const ultimatum = RISKY_USER_PATTERNS.ultimatum.test(t) || RISKY_USER_PATTERNS.coercion.test(t)
  const mentionsCompeting = /(other offer|another offer|competing offer|offer from)/.test(lower)

  if (amount) {
    if (amount >= c.target * 0.97 && amount <= c.target * 1.08) { score += 1.8; strengths.push(`Clear anchor at ${k(amount)} — right around your target`) }
    else if (amount > c.offerBase && amount < c.target * 0.97) { score += 0.9; strengths.push('Named a specific number'); improvements.push(`Consider anchoring at your target (${k(c.target)}) rather than ${k(amount)} — it leaves room to meet in the middle`) }
    else if (amount > c.target * 1.08) { score += 0.8; strengths.push('Named a specific number'); improvements.push(`${k(amount)} is well above your researched target — a number you can justify (${k(c.target)}) is usually more persuasive`) }
    else { improvements.push(`The number you named (${k(amount)}) isn’t above the current offer — anchor with your target, ${k(c.target)}`) }
  } else if (!altAsk || round === 0) {
    improvements.push(`Anchor with a specific number (e.g. ${k(c.target)}) — vague asks are easy to deflect`)
  }

  if (positive) { score += 0.8; strengths.push('Warm, appreciative tone') }
  else improvements.push('Open by reaffirming your interest — it signals you want to make this work')

  if (rationale) { score += 1.0; strengths.push('Grounded the ask in your value or market context') }
  else improvements.push('Add one short reason — your experience, the scope, or comparable roles')

  if (collaborative) { score += 0.7; strengths.push('Kept the conversation open with a question') }
  if (altAsk && round > 0) { score += 0.8; strengths.push('Brought in an alternative lever when base was constrained') }
  else if (!altAsk && round > 0 && c.recommendationState !== 'strong') improvements.push(`If base is truly stuck, pivot to ${c.secondaryAsk.toLowerCase()} or ${c.fallbackAsk.toLowerCase()}`)

  if (words >= 15 && words <= 110) { score += 0.6; strengths.push('Concise — you didn’t over-explain') }
  else if (words < 15) improvements.push('A little more context would help — one or two sentences on why')
  else improvements.push('Try trimming — shorter asks tend to sound more confident')

  if (apologetic) { score -= 1.2; improvements.push('Drop apologetic phrases — asking about pay is a normal part of the process') }
  if (hedging) { score -= 0.6; improvements.push('Replace hedges ("maybe", "just wondering") with a direct statement') }
  if (ultimatum) { score -= 1.6; improvements.push('Avoid ultimatums or pressure — they can damage trust even when you have leverage') }
  if (mentionsCompeting && c.competing.kind === 'none') { score -= 1.2; improvements.push('Only reference offers you actually have — your inputs show no competing offer') }
  else if (mentionsCompeting) { score += 0.4; strengths.push('Referenced your real alternative factually') }

  const improvedVersion = improve(c, round, altAsk)
  return {
    feedback: {
      score: Math.round(clamp(score, 1, 10) * 10) / 10,
      strengths: strengths.slice(0, 4),
      improvements: improvements.slice(0, 3),
      improvedVersion,
    },
    flags: { anchored: !!amount && amount > c.offerBase, altAsk, ultimatum, amount },
  }
}

function improve(c: AIContext, round: number, usedAlt: boolean): string {
  const exp = c.yearsRelevant !== undefined ? `${c.yearsRelevant} years of relevant experience` : 'my background'
  if (round === 0)
    return `I really appreciate that, and I'm excited about the role. Given the scope, ${exp}, and what I'm seeing for comparable roles, I was hoping we could get the base closer to ${k(c.target)}. Is there any flexibility to get there?`
  if (round === 1 && !usedAlt)
    return `That's helpful context, thank you. If base is limited, could we look at ${c.secondaryAsk.toLowerCase()} or a ${c.fallbackAsk.toLowerCase()} to help close the gap? I'd love to find something that works for both of us.`
  return `Thank you for working with me on this. If we can get to ${k(c.fallback)} on base along with what we discussed, I'd be ready to move forward — could you send that over in writing?`
}

function recruiterReply(scenario: PracticeScenarioId, c: AIContext, round: number, f: Analysis['flags']): { text: string; complete: boolean } {
  if (f.ultimatum)
    return { text: `I understand this matters to you. I do want to be honest that framing it that way makes it harder for me to advocate internally. Can you help me understand what would genuinely make this work for you?`, complete: false }
  const signing = Math.max(5_000, Math.round((c.target - c.offerBase) / 2 / 5_000) * 5_000)
  if (round === 0) {
    if (!f.anchored && !f.altAsk) return { text: `I hear you. It would help me to know what you have in mind — is there a specific number that would make this work?`, complete: false }
    if (scenario === 'equity_instead' && f.altAsk) return { text: `Great — I can look at a larger grant. On base, I may be able to find a small amount, but not all the way to ${f.amount ? k(f.amount) : 'that number'}. What matters most to you between the two?`, complete: false }
    if (scenario === 'best_offer') return { text: `I appreciate you being clear. I can't promise anything, but I'll check with the team. If there were room on one item only, which would matter most to you?`, complete: false }
    return { text: `Thanks for sharing that. I can't get base all the way to ${f.amount ? k(f.amount) : 'that'}, but I may be able to get approval for some movement. Are there other parts of the package that matter to you?`, complete: false }
  }
  if (round === 1) {
    if (f.altAsk) return { text: `That's something I can take to the team. If we could bring base to ${k(c.fallback)} and add a ${k(signing)} signing bonus, would that get us to a yes?`, complete: false }
    return { text: `Let me see what I can do. If I came back with ${k(c.fallback)} on base, how would you feel about that?`, complete: false }
  }
  return { text: `Thank you — this has been really helpful. I'll take this to the compensation team and aim to get back to you by the end of the week with an updated written offer.`, complete: true }
}

export interface RoleplayTurnResult {
  feedback: ResponseFeedback
  recruiterReply: string
  complete: boolean
}

const isTurn = (v: unknown): v is RoleplayTurnResult =>
  isObj(v) && isStr(v.recruiterReply) && typeof v.complete === 'boolean' && isObj(v.feedback) && typeof v.feedback.score === 'number'

export function respondToUser(session: PracticeSession, userText: string, c: AIContext): Promise<AIResult<RoleplayTurnResult>> {
  const mock = (): RoleplayTurnResult => {
    const a = coach(userText, c, session.round)
    const reply = recruiterReply(session.scenario, c, session.round, a.flags)
    return { feedback: a.feedback, recruiterReply: reply.text, complete: reply.complete || session.round + 1 >= session.maxRounds }
  }
  return runTask('roleplay_turn', { context: c, scenario: session.scenario, transcript: session.turns, userMessage: userText }, { mock, validate: isTurn, latencyMs: 1000 })
}
