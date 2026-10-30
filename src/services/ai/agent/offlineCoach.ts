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

function acceptReply(ws: CoachWorkspace, cb: CoachCallbacks): string {
  const last = ws.counters[ws.counters.length - 1]
  if (last) {
    // Evaluate their latest terms without logging them again
    const e = callTool('evaluate_counter_offer', { base: last.base, signingBonus: last.signingBonus, equityTotal: last.equityTotal, targetBonusPct: last.targetBonusPct, isNewResponse: false }, ws, cb).evaluation!
    return counterReply(e, ws).replace('\n\nI added this to your negotiation timeline.', '')
  }
  const a = ws.analysis
  return [
    `Based on the information provided, your current offer is **${$(a.compensation.base)}** base (about the ${ordinal(a.marketPosition.basePercentile)} percentile), with an offer score of **${a.offerScore.score}/100**.`,
    '',
    `CompPilot's recommendation is **${a.recommendation.state}**: consider asking for around ${$(a.recommendation.target)} first. Whether to accept is your decision, and it depends on your alternatives and your walk-away number.`,
    '',
    'Once the company responds, tell me what they offered and I’ll evaluate it.',
  ].join('\n')
}

function competingAdvice(ws: CoachWorkspace): string {
  const base = ws.inputs.leverage.competing.base
  const kind = ws.inputs.leverage.situations.includes('multiple_offers') ? 'other offers' : 'another offer'
  return [
    `Mention it once, factually, and pair it with genuine interest in ${ws.inputs.offer.company || 'this role'}. The point is to give context, not to create pressure.`,
    '',
    '- Bring it up when you make your ask, not as an opening line.',
    `- Share the number${base ? ` (${$(base)})` : ''} only if you're comfortable, and only what's true.`,
    '- Make clear this role is your preference, if it is.',
    '- Don’t set deadlines or ultimatums you don’t intend to keep.',
    '',
    'Draft reply:',
    `I want to be transparent that I have ${kind}${base ? ` with a base of ${$(base)}` : ''}. ${ws.inputs.offer.company || 'This role'} is my first choice, and I'd love to find a way to make it work. Is there flexibility to get the base closer to ${$(ws.analysis.recommendation.target)}?`,
  ].join('\n')
}

function equityAdvice(ws: CoachWorkspace, cb: CoachCallbacks): string {
  const c = ws.analysis.compensation
  const ev = callTool('run_what_if', { equityTotal: 0 }, ws, cb).whatIf!
  return [
    `The grant is valued at **${$(ws.inputs.offer.equityTotal)}** over ${ws.inputs.offer.vestingYears ?? 4} years, about **${$(c.annualEquity)} a year**. That's the value stated in the offer, not a guaranteed amount.`,
    '',
    c.equityIsLiquid
      ? '- Public-company stock can be sold as it vests, but its value moves with the share price.'
      : '- Private-company equity usually can’t be sold until an exit (IPO or acquisition), and it could end up worth less, or nothing.',
    `- If you counted it as zero, total comp would be **${$(ev.after.totalComp)}/yr** and the offer score **${ev.after.offerScore}** instead of ${ev.before.offerScore}.`,
    '- Worth asking: the number of shares or units, the latest valuation or strike price, the vesting schedule, and whether refresh grants are typical.',
  ].join('\n')
}

function signingAdvice(ws: CoachWorkspace): string {
  const a = ws.analysis
  const gap = Math.max(5_000, roundTo(Math.max(a.recommendation.target - a.compensation.base, 0), 5_000))
  const forfeits = (ws.inputs.profile.currentBonus ?? 0) > 0 || (ws.inputs.profile.currentEquity ?? 0) > 0
  return [
    `It’s a reasonable ask${ws.inputs.offer.signingBonus ? '' : ', since the offer doesn’t include one'}. Signing bonuses are one-time, so companies often find them easier to approve than a higher base.`,
    '',
    `- A natural size is the gap to your target: about **${$(gap)}**.`,
    forfeits ? '- You’d leave behind bonus or unvested equity at your current job, which is a fair reason to ask.' : '- It works best as a second ask, if base can’t move far.',
    `- Your strategy has it as the ${a.strategy.fallback.type === 'signing' ? 'fallback' : a.strategy.secondary.type === 'signing' ? 'secondary ask' : 'lever to use if base is fixed'}: lead with ${a.strategy.primary.label.toLowerCase()} first.`,
  ].join('\n')
}

function walkAwayAdvice(ws: CoachWorkspace): string {
  const current = ws.analysis.compensation.currentTotalComp
  return [
    'Your walk-away number is personal, so CompPilot won’t pick it for you. Some things that help decide it:',
    '',
    `- What you earn today${current ? ` (about ${$(current)} total)` : ''} and what a move would cost you.`,
    `- Your alternatives${ws.inputs.leverage.competing.base ? `, like your ${$(ws.inputs.leverage.competing.base)} competing offer` : ''}, including staying where you are.`,
    '- Your budget and how much risk you can take on (for example, equity that may not pay out).',
    '- How much the role itself matters to you beyond pay.',
    '',
    'Once you have a number, set it on the Strategy tab and I’ll compare every response against it.',
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

  const accepting = /should i (accept|take)|accept (their|the|this|it)|take (their|the|this) offer/.test(m)
  let reply: string
  if (accepting && !reported) {
    reply = acceptReply(ws, cb)
  } else if (/competing|other offer|another offer/.test(m) && /mention|bring|use|tell|share|raise|leverage|handle/.test(m)) {
    reply = competingAdvice(ws)
  } else if (/equity|rsu|stock|options|shares/.test(m) && /worth|value|real|count|risk/.test(m) && !hypothetical) {
    reply = equityAdvice(ws, cb)
  } else if (/sign(ing|-on| on)/.test(m) && /should i|ask for|worth asking|is it ok|reasonable/.test(m) && !hypothetical) {
    reply = signingAdvice(ws)
  } else if (/walk.?away/.test(m)) {
    reply = walkAwayAdvice(ws)
  } else if (!hasTerms && /below market|above market|market|fair|competitive|good offer|underpaid|low ?ball/.test(m)) {
    reply = explain('market', ws)
  } else if (hasTerms && hypothetical && !reported) {
    reply = whatIfReply(callTool('run_what_if', terms, ws, cb))
  } else if (hasTerms && (reported || !hypothetical)) {
    const ev = callTool('evaluate_counter_offer', terms, ws, cb)
    callTool('log_counter_offer', { ...terms, note: message.slice(0, 120) }, ws, cb)
    reply = counterReply(ev.evaluation!, ws)
  } else if (/\bwhy\b|explain|how (is|was|did)|what does|break ?down/.test(m)) {
    reply = explain(m, ws)
  } else if (/accept|take it|good enough|is (this|it) (good|fair)|should i/.test(m)) {
    reply = acceptReply(ws, cb)
  } else if (/draft|write|email|reply|message|what (do|should) i say/.test(m)) {
    const last = ws.counters[ws.counters.length - 1]
    if (last) {
      const e = COACH_TOOLS.find((t) => t.name === 'evaluate_counter_offer')!.run({ base: last.base, signingBonus: last.signingBonus, equityTotal: last.equityTotal, targetBonusPct: last.targetBonusPct, isNewResponse: false }, ws).event.evaluation!
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

