import type { AutofillKey, CompanyStage, ExtractedField, JobLevel, MatchQuality, OfferExtraction, WorkArrangement } from '../../types'
import { isObj, isStr, runTask, type AIResult } from './provider'

// ---------------------------------------------------------------------------
// Deterministic offer-letter parser (mock for the `offer_extraction` AI task).
// Every value carries the sentence it came from so the user can verify it.
// ---------------------------------------------------------------------------

const WORD_NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 }
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

const CITY_TO_LOCATION: [RegExp, string][] = [
  [/\b(san francisco|bay area|palo alto|mountain view|menlo park|san jose|sunnyvale|oakland)\b/i, 'sf'],
  [/\b(new york|nyc|brooklyn|manhattan)\b/i, 'nyc'],
  [/\b(seattle|bellevue|redmond|kirkland)\b/i, 'sea'],
  [/\b(boston|cambridge, ma)\b/i, 'bos'],
  [/\b(los angeles|santa monica)\b/i, 'la'],
  [/\bsan diego\b/i, 'sd'],
  [/\b(washington,? d\.?c\.?|arlington, va)\b/i, 'dc'],
  [/\baustin\b/i, 'aus'],
  [/\b(denver|boulder)\b/i, 'den'],
  [/\bchicago\b/i, 'chi'],
  [/\bportland\b/i, 'pdx'],
  [/\batlanta\b/i, 'atl'],
]

interface Sentence {
  text: string
  lower: string
}

/** Re-joins lines that a PDF wrapped mid-sentence, keeping headings and "Label: value" lines separate. */
export function unwrapLines(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    const prev = out[out.length - 1]
    const joinable =
      prev !== undefined && prev !== '' && line !== '' &&
      prev.length > 50 && !/[.!?:]$/.test(prev) && !/^[\w ()/&-]{2,40}:\s*\S/.test(line)
    if (joinable) out[out.length - 1] = `${prev} ${line}`
    else out.push(line)
  }
  return out.join('\n')
}

function splitSentences(text: string): Sentence[] {
  return unwrapLines(text)
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z(])/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ({ text: s, lower: s.toLowerCase() }))
}

const MONEY = /\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s?([kKmM])?(?!\d|,\d)/g

function moneyIn(s: string): number[] {
  const out: number[] = []
  for (const m of s.matchAll(MONEY)) {
    let n = parseFloat(m[1].replace(/,/g, '') + (m[2] ? `.${m[2]}` : ''))
    if (m[3]?.toLowerCase() === 'k') n *= 1_000
    if (m[3]?.toLowerCase() === 'm') n *= 1_000_000
    out.push(n)
  }
  return out
}

const clip = (s: string) => (s.length > 220 ? `${s.slice(0, 217)}…` : s)

function firstMatch(sentences: Sentence[], include: RegExp, exclude?: RegExp): Sentence | undefined {
  const hits = sentences.filter((s) => include.test(s.lower) && !(exclude && exclude.test(s.lower)))
  // Prefer a sentence with a number in it over a bare heading like "Equity."
  return hits.find((s) => /\d/.test(s.text)) ?? hits[0]
}

function toNumber(word: string): number | undefined {
  const n = Number(word)
  return Number.isFinite(n) ? n : WORD_NUM[word.toLowerCase()]
}

function parseDate(raw: string): string | undefined {
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return iso[0]
  const us = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`
  const long = raw.match(/([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i)
  if (long) {
    const mi = MONTHS.indexOf(long[1].toLowerCase())
    if (mi >= 0) return `${long[3]}-${String(mi + 1).padStart(2, '0')}-${long[2].padStart(2, '0')}`
  }
  return undefined
}

export function inferLevel(role: string): JobLevel | undefined {
  const r = role.toLowerCase()
  if (/\bprincipal\b/.test(r)) return 'principal'
  if (/\bdirector\b|\bhead of\b|\bvp\b/.test(r)) return 'director'
  if (/\bsenior manager\b|\bsr\.? manager\b/.test(r)) return 'senior_manager'
  if (/\bmanager\b/.test(r) && !/product manager|program manager|project manager|account manager/.test(r)) return 'manager'
  if (/\bstaff\b|\blead\b/.test(r)) return 'staff'
  if (/\bsenior\b|\bsr\.?\b/.test(r)) return 'senior'
  if (/\bjunior\b|\bjr\.?\b|\bassociate\b|\bentry\b|\bnew grad|\bintern\b/.test(r)) return 'entry'
  return undefined
}

function cleanCompany(name: string): string {
  let n = name.replace(/[,.]?\s*(inc\.?|llc|ltd\.?|corp\.?|corporation|co\.)$/i, '').replace(/[,.;:]+$/, '').trim()
  if (n === n.toUpperCase()) n = n.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  return n
}

const CAP_WORDS = "[A-Z][\\w&'.-]*(?:\\s+(?:of\\s+|&\\s+)?[A-Z][\\w&'.-]*){0,4}"

export function parseOfferText(text: string): OfferExtraction {
  const sentences = splitSentences(text)
  const fields: ExtractedField[] = []
  const warnings: string[] = []
  const add = (key: AutofillKey, value: string | number, confidence: MatchQuality, evidence: string, note?: string) => {
    if (!fields.some((f) => f.key === key)) fields.push({ key, value, confidence, evidence: clip(evidence), note })
  }

  // --- Company
  const companyPatterns: [RegExp, MatchQuality][] = [
    [new RegExp(`[Oo]n behalf of\\s+(${CAP_WORDS})`), 'high'],
    [new RegExp(`(?:[Oo]ffer of employment|[Oo]ffer)\\s+(?:from|with)\\s+(${CAP_WORDS})`), 'high'],
    [new RegExp(`\\b(?:join|at)\\s+(${CAP_WORDS})(?=[\\s,.!]|$)`), 'medium'],
    [new RegExp(`[Ww]elcome to\\s+(${CAP_WORDS})(?=[\\s,.!]|$)`), 'medium'],
    [new RegExp(`^(${CAP_WORDS}),?\\s+(?:Inc\\.?|LLC|Ltd\\.?|Corp\\.?)`, 'm'), 'medium'],
  ]
  for (const [re, conf] of companyPatterns) {
    const s = sentences.find((x) => re.test(x.text))
    const m = s?.text.match(re)
    if (s && m) {
      const name = cleanCompany(m[1])
      if (name.length > 1 && !/^(the|our|a|an|this|your)$/i.test(name)) {
        add('offer.company', name, conf, s.text)
        break
      }
    }
  }

  // --- Role & level
  const rolePatterns: RegExp[] = [
    /^(?:position|title|job title|role)\s*:\s*(.+)$/i,
    /(?:position|role) of\s+(?:an?\s+)?([A-Z][\w/&'()-]*(?:\s+(?:of\s+|and\s+|&\s+)?[A-Z(][\w/&'()-]*){0,6})/,
    /\bas (?:an?|our)\s+([A-Z][\w/&'()-]*(?:\s+[A-Z(][\w/&'()-]*){0,6})/,
  ]
  for (const re of rolePatterns) {
    const s = sentences.find((x) => re.test(x.text))
    const m = s?.text.match(re)
    if (s && m) {
      const role = m[1].replace(/[,.;:]+$/, '').replace(/\s+(?:at|with|on|in)\s+.*$/i, '').trim()
      if (role.length > 2 && role.length < 80) {
        add('offer.role', role, re === rolePatterns[0] || re === rolePatterns[1] ? 'high' : 'medium', s.text)
        add('profile.jobTitle', role, 'low', s.text, 'Assumed to match the offered role. Change it if your current title is different.')
        const lvl = inferLevel(role)
        if (lvl) add('offer.level', lvl, 'medium', s.text, 'Inferred from the job title.')
        break
      }
    }
  }

  // --- Base salary
  const comp = /bonus|sign[- ]?on|signing|relocat|equity|rsu|stock|option|stipend|match|grant|allowance|reimburs|401/
  let baseFound = false
  for (const s of sentences) {
    if (!/base salary|annual salary|base pay|salary|annual base|annualized|compensation|pay rate|rate of pay|hourly rate|wage/.test(s.lower)) continue
    if (comp.test(s.lower) && !/base salary|annual salary/.test(s.lower)) continue
    const amounts = moneyIn(s.text)
    if (!amounts.length) continue
    // If the sentence mixes salary with other comp, take the first amount (usually the salary)
    let v = comp.test(s.lower) ? amounts[0] : Math.max(...amounts)
    let conf: MatchQuality = /base salary|annual salary|base pay|annual base/.test(s.lower) ? 'high' : 'medium'
    let note: string | undefined
    if (/per hour|hourly|\/\s?hr\b/.test(s.lower) && v < 1_000) { v *= 2080; conf = 'low'; note = 'Converted from an hourly rate (× 2,080 hours).' }
    else if (/bi-?weekly|every two weeks/.test(s.lower) && v < 20_000) { v *= 26; conf = 'low'; note = 'Converted from a bi-weekly amount (× 26).' }
    else if (/semi-?monthly/.test(s.lower) && v < 20_000) { v *= 24; conf = 'low'; note = 'Converted from a semi-monthly amount (× 24).' }
    else if (/per month|monthly/.test(s.lower) && v < 40_000) { v *= 12; conf = 'low'; note = 'Converted from a monthly amount (× 12).' }
    if (v < 10_000) continue
    add('offer.base', Math.round(v), conf, s.text, note)
    baseFound = true
    break
  }
  if (!baseFound) warnings.push('We couldn’t find a base salary. Please enter it on the offer step.')

  // --- Bonus %
  const bonusS = firstMatch(sentences, /(bonus|incentive)[^.]*\d+(\.\d+)?\s?%|\d+(\.\d+)?\s?%[^.]*(bonus|incentive)/, /401|match|vest|raise|equity/)
  const bonusM = bonusS?.text.match(/(\d{1,3}(?:\.\d+)?)\s?%/)
  if (bonusS && bonusM) add('offer.targetBonusPct', Number(bonusM[1]), /target/.test(bonusS.lower) ? 'high' : 'medium', bonusS.text)

  // --- Signing bonus
  const signS = firstMatch(sentences, /sign[- ]?on|signing bonus|sign on|joining bonus/)
  const signAmt = signS ? moneyIn(signS.text)[0] : undefined
  if (signS && signAmt) add('offer.signingBonus', signAmt, 'high', signS.text)

  // --- Equity
  const eqS = firstMatch(sentences, /\brsus?\b|restricted stock|equity|stock units|stock options?|\boptions\b|\bshares\b/, /401|match/)
  if (eqS) {
    const amounts = moneyIn(eqS.text)
    if (amounts.length) {
      add('offer.equityTotal', Math.max(...amounts), /value|worth|valued/.test(eqS.lower) ? 'high' : 'medium', eqS.text, 'Stated grant value. Equity can fluctuate or become worthless.')
    } else {
      const shares = eqS.text.match(/(\d{1,3}(?:,\d{3})+|\d+)\s+(?:rsus|shares|stock options|options|units)/i)
      warnings.push(
        shares
          ? `Your letter describes equity as ${shares[1]} units without a dollar value. Enter an estimated total value yourself (units × price per share).`
          : 'Your letter mentions equity but no dollar value. Enter an estimated total value yourself.',
      )
    }
    const v = eqS.text.match(/(?:over|across)\s+(?:a\s+period\s+of\s+)?(\w+)\s*(?:\(\d\)\s*)?years?/i) ?? eqS.text.match(/(\w+)[- ]year vesting/i)
    const years = v ? toNumber(v[1]) : undefined
    if (years && years <= 6) add('offer.vestingYears', years, 'high', eqS.text)
  }

  // --- Other annual comp: stipends / allowances with a dollar amount
  const stipendS = firstMatch(sentences, /stipend|allowance/, /relocat|one-time|sign/)
  const stipendAmt = stipendS ? moneyIn(stipendS.text).find((n) => n < 50_000) : undefined
  if (stipendS && stipendAmt) add('offer.otherAnnualComp', stipendAmt, 'medium', stipendS.text, 'Counted as recurring annual value (stipend/allowance).')

  // --- PTO
  const ptoS = firstMatch(sentences, /paid time off|\bpto\b|vacation/)
  if (ptoS) {
    const d = ptoS.text.match(/(\d{1,2})\s+(?:business\s+|working\s+)?days/i)
    if (d && /paid time off|pto|vacation/.test(ptoS.lower)) add('offer.ptoDays', Number(d[1]), 'high', ptoS.text)
    else if (/unlimited|flexible/.test(ptoS.lower)) warnings.push('Your letter mentions flexible/unlimited PTO. We left the PTO days blank. Enter a typical number if you know it.')
  }

  // --- Remote policy & location
  const remoteS = firstMatch(sentences, /fully remote|100% remote|remote (?:role|position)|location:\s*remote|work remotely/)
  const hybridS = firstMatch(sentences, /hybrid|days? (?:per|a|each) week in (?:the |our )?office/)
  const onsiteS = firstMatch(sentences, /on-?site|in[- ]office (?:five|5) days|in person/)
  const policy: [WorkArrangement, Sentence] | undefined = hybridS ? ['hybrid', hybridS] : remoteS ? ['remote', remoteS] : onsiteS ? ['onsite', onsiteS] : undefined
  if (policy) add('offer.remotePolicy', policy[0], 'high', policy[1].text)

  let locFound = false
  for (const s of sentences) {
    const hit = CITY_TO_LOCATION.find(([re]) => re.test(s.text))
    if (hit && /office|based|location|located|work|role|position/.test(s.lower)) {
      add('profile.location', hit[1], 'medium', s.text, 'Where the role is based.')
      locFound = true
      break
    }
  }
  if (!locFound) {
    const anyCity = sentences.find((s) => CITY_TO_LOCATION.some(([re]) => re.test(s.text)))
    if (anyCity) add('profile.location', CITY_TO_LOCATION.find(([re]) => re.test(anyCity.text))![1], 'low', anyCity.text, 'Taken from an address in the letter. Confirm this is where the role is based.')
    else if (policy?.[0] === 'remote' && /\b(us|u\.s\.|united states)\b/i.test(policy[1].text + ' ' + text.slice(0, 2000)))
      add('profile.location', 'remote_us', 'medium', policy[1].text)
  }

  // --- Start date
  for (const s of sentences) {
    if (!/start date|start on|starting on|begin on|commence|first day/.test(s.lower)) continue
    const date = parseDate(s.text)
    if (date) {
      add('offer.startDate', date, 'high', s.text)
      break
    }
  }

  // --- Relocation
  const reloS = firstMatch(sentences, /relocat/)
  const reloAmt = reloS ? moneyIn(reloS.text)[0] : undefined
  if (reloS && reloAmt) add('offer.relocation', reloAmt, 'high', reloS.text)

  // --- Company stage
  const stageRules: [RegExp, CompanyStage][] = [
    [/publicly traded|nasdaq|nyse|public company/, 'public'],
    [/pre-?ipo|late[- ]stage|series [e-h]\b/, 'late'],
    [/series [c-d]\b|growth[- ]stage/, 'growth'],
    [/series [ab]\b|seed[- ]stage|early[- ]stage|\bseed\b/, 'early'],
  ]
  for (const [re, stage] of stageRules) {
    const s = sentences.find((x) => re.test(x.lower))
    if (s) {
      add('offer.companyStage', stage, 'medium', s.text, 'Inferred from how the letter describes the company.')
      break
    }
  }

  // --- Benefits summary
  const benefits: string[] = []
  const all = text.toLowerCase()
  const healthBits = ['medical', 'dental', 'vision'].filter((b) => all.includes(b))
  if (healthBits.length) benefits.push(healthBits.map((b, i) => (i ? b : b[0].toUpperCase() + b.slice(1))).join(', '))
  const k401 = text.match(/401\s?\(?k\)?[^.]{0,60}?(\d{1,2}(?:\.\d)?)\s?%/i)
  if (k401) benefits.push(`401(k) with ${k401[1]}% match`)
  else if (/401\s?\(?k\)?/i.test(text)) benefits.push('401(k)')
  const parental = text.match(/(\d{1,2})\s+weeks?\s+(?:of\s+)?(?:paid\s+)?parental leave/i)
  if (parental) benefits.push(`${parental[1]} weeks parental leave`)
  else if (/parental leave/i.test(text)) benefits.push('Parental leave')
  if (stipendS && stipendAmt) benefits.push(`$${stipendAmt.toLocaleString('en-US')} ${/learning|education|development/.test(stipendS.lower) ? 'learning ' : ''}stipend`)
  if (/unlimited|flexible\s*\(?unlimited/.test(ptoS?.lower ?? '')) benefits.push('Flexible / unlimited PTO')
  if (/commuter/i.test(text)) benefits.push('Commuter benefits')
  if (benefits.length) add('offer.benefitsNotes', benefits.join('; '), 'medium', 'Summarized from the benefits mentioned in your letter.')

  if (fields.length > 0 && fields.length < 4) warnings.push('We found only a few details. The letter may use unusual wording, so please check the remaining fields manually.')
  return { fields, warnings }
}

// ---------------------------------------------------------------------------

const isExtraction = (v: unknown): v is OfferExtraction =>
  isObj(v) && Array.isArray(v.warnings) && Array.isArray(v.fields) &&
  v.fields.every((f) => isObj(f) && isStr(f.key) && (isStr(f.value) || typeof f.value === 'number') && isStr(f.confidence) && isStr(f.evidence))

/** Extracts structured offer details from letter text. Only the text is sent to an LLM endpoint, never the file. */
export function extractOfferDetails(text: string): Promise<AIResult<OfferExtraction>> {
  return runTask('offer_extraction', { text: text.slice(0, 20_000) }, { mock: () => parseOfferText(text), validate: isExtraction, latencyMs: 600 })
}
