// Removes personal details from offer-letter text before it is stored or sent to an AI service.
// Pay figures, company, role and city stay, because they are what the analysis needs.

const STREET_SUFFIX = 'Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Way|Court|Ct|Place|Pl|Parkway|Pkwy|Terrace|Circle|Highway|Hwy'

const RULES: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]'],
  [/\b\d{3}-\d{2}-\d{4}\b/g, '[id]'], // US SSN format
  [/(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g, '[phone]'],
  [new RegExp(`\\b\\d{1,6}\\s+(?:[A-Z][\\w'.-]*\\s+){1,4}(?:${STREET_SUFFIX})\\b\\.?(?:\\s+(?:North|South|East|West|N|S|E|W)\\b)?(?:,?\\s*(?:Suite|Ste|Apt|Unit|Floor|#)\\.?\\s*[\\w-]+)?`, 'g'), '[address]'],
  [/(,\s*[A-Z]{2})\s+\d{5}(?:-\d{4})?\b/g, '$1'], // ZIP code after a state; city and state are kept
  [/\b(employee|candidate|requisition|req|job)\s*(id|number|no\.?|#)\s*[:#]?\s*[\w-]+/gi, '$1 $2 [id]'],
]

/** The recipient's name from the salutation, e.g. "Dear Jordan Lee," → "Jordan Lee". */
export function findRecipientName(text: string): string | undefined {
  const m = text.match(/\b(?:Dear|Hi|Hello)\s+((?:Mr\.?|Ms\.?|Mrs\.?|Dr\.?)\s+)?([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){0,2})\s*[,:]/)
  return m?.[2]
}

/** The signer's name after a sign-off, e.g. "Sincerely,\nPriya Raman, Director" → "Priya Raman". */
export function findSignerName(text: string): string | undefined {
  const m = text.match(/\b(?:Sincerely|Regards|Best regards|Kind regards|Warm regards|Best wishes|Best),?\s*\n\s*([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){1,2})\s*(?:,|\n|$)/)
  return m?.[1]
}

export function redactPersonalDetails(text: string, names: string[] = []): string {
  let out = text
  for (const [re, replacement] of RULES) out = out.replace(re, replacement)
  // The recipient's full name and each part of it (e.g. a first name used later in the letter)
  const parts = new Set<string>()
  for (const n of names.filter(Boolean)) {
    parts.add(n)
    for (const p of n.split(/\s+/)) if (p.length >= 3) parts.add(p)
  }
  for (const p of [...parts].sort((a, b) => b.length - a.length)) {
    out = out.replace(new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), '[name]')
  }
  return out.replace(/\[name\](\s+\[name\])+/g, '[name]')
}
