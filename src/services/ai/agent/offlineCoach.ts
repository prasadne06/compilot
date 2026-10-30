// Offline coach: understands a few common requests with fixed rules and calls the same
// tools as the Claude-powered coach. Used where Claude isn't available.

import { formatCurrency as $, k, ordinal, roundTo } from '../../../lib/format'
import type { CounterEvaluation, CounterOffer } from '../../../types'
import { COACH_TOOLS } from './tools'
import type { CoachCallbacks, CoachWorkspace, ToolEvent } from './types'

type Terms = Omit<CounterOffer, 'id' | 'at' | 'note'>

const AMOUNT = /\$?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k|m)?\b(\s?%)?/gi

/** Pulls offer terms out of a sentence like "205K base plus a 10K signing bonus and 15% bonus". */
export function parseTerms(text: string): Terms {
  const terms: Terms = {}
  // Split into clauses so each number is read with the words around it
  // Split at ", " (not inside 200,000), ";", "and", "plus", "with", "+"
  for (const clause of text.split(/,\s|;|\band\b|\bplus\b|\bwith\b|\+/i)) {
    const c = clause.toLowerCase()
    for (const m of clause.matchAll(AMOUNT)) {
      let n = parseFloat(m[1].replace(/,/g, ''))
      const pct = !!m[3]
      if (m[2]?.toLowerCase() === 'k') n *= 1_000
      if (m[2]?.toLowerCase() === 'm') n *= 1_000_000
      if (pct) {
        if (/bonus|target|incentive/.test(c) || !/equity|match|401/.test(c)) terms.targetBonusPct ??= n
        continue
      }
      if (n < 1_000) continue
      if (/sign(ing|-on| on)?\b|joining/.test(c)) terms.signingBonus ??= n
      else if (/equity|rsu|stock|shares|options|grant/.test(c)) terms.equityTotal ??= n
      else if (/bonus/.test(c) && n < 100_000) terms.signingBonus ??= n
      else if (n >= 20_000) terms.base ??= n
    }
  }
  return terms
}

function callTool(name: (typeof COACH_TOOLS)[number]['name'], input: Record<string, unknown>, ws: CoachWorkspace, cb: CoachCallbacks): ToolEvent {
  const tool = COACH_TOOLS.find((t) => t.name === name)!
  const { event } = tool.run(input, ws)
  cb.onTool(event)
  return event
}

function competingLine(ws: CoachWorkspace): string {
  const s = ws.inputs.leverage.situations
  const base = ws.inputs.leverage.competing.base
  if (!(s.includes('written_offer') || s.includes('multiple_offers'))) return ''
  return base ? ` I also have another written offer at ${$(base)}, though this role is my first choice.` : ''
}

function draftFor(e: CounterEvaluation, ws: CoachWorkspace): string {
  const company = ws.inputs.offer.company || 'the team'
  const signingAsk = Math.max(5_000, roundTo(Math.max(e.target - e.counter.base, 0), 5_000))
  switch (e.move) {
    case 'accept':
      return `Thank you for working with me on this. I'm happy to accept at ${$(e.counter.base)} base. Could you send over the updated offer letter so I can sign?`
    case 'close':
      if (e.nextLever === 'signing bonus')
        return `Thank you, I really appreciate the movement. If we could add a ${$(signingAsk)} signing bonus, I'd be ready to sign right away. Is that possible?`
      if (e.nextLever === 'equity')
        return `Thank you, I really appreciate you going back to the team. If there's any flexibility to add a bit more equity, I'd be ready to sign right away. Either way, I'm excited to join ${company}.`
      return `Thank you, I appreciate you going back to the team. This works for me, and I'm excited to join ${company}. Could you send the updated offer letter?`
    case 'pivot':
      return `I understand the base may be fixed at this level, and I appreciate you checking. Would there be flexibility on a ${$(signingAsk)} signing bonus or additional equity to help close the gap? That would make this an easy yes for me.`
    case 'below_walk_away':
    case 'counter':
      return `Thanks for coming back with ${$(e.counter.base)}. I'm still very excited about the role. Given the scope and my experience, I was hoping we could meet at ${$(e.suggestedCounterBase ?? e.target)}.${competingLine(ws)} If we can get there, I'm ready to move forward.`
  }
}

function counterReply(e: CounterEvaluation, ws: CoachWorkspace): string {
  const lines = [
    `**${e.moveLabel}.**`,
    '',
    `Their offer: **${$(e.counter.base)}** base (${e.baseIncrease >= 0 ? '+' : ''}${$(e.baseIncrease)} vs. the original), estimated total comp **${$(e.counter.totalComp)}/yr**. Your target is ${$(e.target)} and your fallback ${$(e.fallback)}.`,
    '',
    ...e.reasons.map((r) => `- ${r}`),
    '',
    'I added this to your negotiation timeline.',
    '',
    'Draft reply:',
    draftFor(e, ws),
  ]
  return lines.join('\n')
}

function whatIfReply(ev: ToolEvent): string {
  const r = ev.whatIf!
  const d = (a: number, b: number, f: (n: number) => string) => `${f(a)} → **${f(b)}**`
  return [
    `Here's what changes with ${r.changes.join(', ')} (estimated, using CompPilot's illustrative benchmark):`,
    '',
    `- Offer score: ${d(r.before.offerScore, r.after.offerScore, String)}`,
    `- Base percentile: ${d(r.before.basePercentile, r.after.basePercentile, ordinal)}`,
    `- Total comp: ${d(r.before.totalComp, r.after.totalComp, (n) => $(n))} per year`,
    r.after.firstYearTotal !== r.after.totalComp ? `- First year incl. signing: ${$(r.after.firstYearTotal)}` : null,
    `- Recommendation: ${r.before.recommendation} → **${r.after.recommendation}**`,
    '',
    'This is a scenario only. Your saved offer hasn’t changed.',
  ].filter((l) => l !== null).join('\n')
}

function explain(topic: string, ws: CoachWorkspace): string {
  const a = ws.analysis
  if (/leverage/.test(topic)) {
    const pos = a.leverage.factors.filter((f) => f.kind === 'strength')
    const neg = a.leverage.factors.filter((f) => f.kind === 'weakness')
    return [
      `Your leverage is **${a.leverage.score}/100 (${a.leverage.label.toLowerCase()})**. Everyone starts at 30, and each factor adds or subtracts:`,
      '',
      ...pos.map((f) => `- ${f.label}: **+${f.points}**`),
      ...neg.map((f) => `- ${f.label}: **${f.points}**`),
      '',
      neg.length ? `The main thing holding it back: ${neg[0].label.toLowerCase()}.` : 'Nothing notable is holding it back.',
    ].join('\n')
  }
  if (/confiden/.test(topic))
    return [`Confidence is **${a.confidence.score}%**. It reflects how well your situation matches the benchmark model:`, '', ...a.confidence.factors.map((f) => `- ${f.label}: **${f.rating}**. ${f.detail}`)].join('\n')
  if (/target|fallback|range|ask/.test(topic))
    return [`Your target is **${$(a.recommendation.target)}**, with a fallback of **${$(a.recommendation.fallback)}**. Here's why:`, '', ...a.recommendation.rationale.map((r) => `- ${r}`)].join('\n')
  if (/market|percentile|range|benchmark/.test(topic)) {
    const b = a.benchmark.base
    return `The estimated base range for this role is **${k(b.low)}–${k(b.high)}** (median ${k(b.median)}), and your offer sits near the **${ordinal(a.marketPosition.basePercentile)} percentile**. These are illustrative estimates, not live market data.`
  }
  return [`Your offer score is **${a.offerScore.score}/100**. It combines:`, '', ...a.offerScore.components.map((c) => `- ${c.label} (${Math.round(c.weight * 100)}%): **${c.score}**`)].join('\n')
}

function help(ws: CoachWorkspace): string {
  const a = ws.analysis
  return [
    `I can help with your ${k(a.compensation.base)} offer. Try:`,
    '',
    '- Tell me what the company came back with, e.g. "They offered 205K base and a 10K signing bonus"',
    '- Ask a what-if, e.g. "What if base goes to 215K?"',
    '- Ask why, e.g. "Why is my leverage ' + a.leverage.score + '?"',
    '- Ask "Should I accept?" or "Draft my reply"',
  ].join('\n')
}

/** Runs one turn of the offline coach. */
export async function runOfflineCoach(message: string, ws: CoachWorkspace, cb: CoachCallbacks): Promise<string> {
  await new Promise((r) => setTimeout(r, 450))
  const m = message.toLowerCase()
  const terms = parseTerms(message)
  const hasTerms = Object.keys(terms).length > 0
  const hypothetical = /what if|what about|how about|suppose|if (i|we|they|the base|base)|would .* change|scenario/.test(m)
  const reported = /(they|recruiter|company|hr|manager|she|he)\b.*\b(offer|came back|counter|said|can do|could do|propos|increas|bump|raise|agreed|meet|revis)|came back|counter-?offer|new offer|revised/.test(m)

  let reply: string
  if (hasTerms && hypothetical && !reported) {
    reply = whatIfReply(callTool('run_what_if', terms, ws, cb))
  } else if (hasTerms && (reported || !hypothetical)) {
    const ev = callTool('evaluate_counter_offer', terms, ws, cb)
    callTool('log_counter_offer', { ...terms, note: message.slice(0, 120) }, ws, cb)
    reply = counterReply(ev.evaluation!, ws)
  } else if (/\bwhy\b|explain|how (is|was|did)|what does|break ?down/.test(m)) {
    reply = explain(m, ws)
  } else if (/accept|take it|good enough|is (this|it) (good|fair)|should i/.test(m)) {
    const last = ws.counters[ws.counters.length - 1]
    if (last) {
      const e = callTool('evaluate_counter_offer', { base: last.base, signingBonus: last.signingBonus, equityTotal: last.equityTotal, targetBonusPct: last.targetBonusPct }, ws, cb).evaluation!
      reply = counterReply(e, ws).replace('\n\nI added this to your negotiation timeline.', '')
    } else {
      const a = ws.analysis
      reply = [
        `Based on the information provided, your current offer is **${$(a.compensation.base)}** base (about the ${ordinal(a.marketPosition.basePercentile)} percentile), with an offer score of **${a.offerScore.score}/100**.`,
        '',
        `CompPilot's recommendation is **${a.recommendation.state}**: consider asking for around ${$(a.recommendation.target)} first. Whether to accept is your decision, and it depends on your alternatives and your walk-away number.`,
        '',
        'Once the company responds, tell me what they offered and I’ll evaluate it.',
      ].join('\n')
    }
  } else if (/draft|write|email|reply|message|what (do|should) i say/.test(m)) {
    const last = ws.counters[ws.counters.length - 1]
    if (last) {
      const e = COACH_TOOLS.find((t) => t.name === 'evaluate_counter_offer')!.run({ base: last.base, signingBonus: last.signingBonus, equityTotal: last.equityTotal }, ws).event.evaluation!
      reply = `Here's a reply to their latest offer. ${e.moveLabel}.\n\nDraft reply:\n${draftFor(e, ws)}`
    } else {
      const a = ws.analysis
      reply = `Here's an opening ask based on your target:\n\nDraft reply:\nThank you so much for the offer. I'm genuinely excited about the role. Based on the scope, my experience and what I'm seeing for comparable roles, I was hoping we could get the base closer to ${$(a.recommendation.target)}.${competingLine(ws)} Is there flexibility there?`
    }
  } else {
    reply = help(ws)
  }
  // Offline replies arrive in one piece
  cb.onText(reply)
  return reply
}

