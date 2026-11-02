import { describe, expect, it } from 'vitest'
import { findRecipientName, findSignerName, redactPersonalDetails } from '../../src/services/documents/redact'
import { checkConversationalText, checkGuardrails } from '../../src/services/ai/guardrails'

describe('redactPersonalDetails', () => {
  const letter = `NORTHWIND LABS
1201 Western Avenue, Seattle, WA 98101
Dear Jordan Lee,
Jordan, your base salary will be $195,000. Reach me at priya@northwind.example or (206) 555-0142.
Candidate ID: NW-4471. SSN on file 123-45-6789.
Sincerely,
Priya Raman, Director of Design`

  const names = [findRecipientName(letter), findSignerName(letter)].filter(Boolean) as string[]
  const out = redactPersonalDetails(letter, names)

  it('finds the recipient and signer', () => {
    expect(names).toEqual(['Jordan Lee', 'Priya Raman'])
  })

  it('removes names, contact details, IDs and street address', () => {
    for (const s of ['Jordan', 'Lee', 'Priya', 'Raman', 'priya@', '555-0142', '123-45-6789', 'NW-4471', '1201 Western', '98101']) {
      expect(out).not.toContain(s)
    }
  })

  it('keeps what the analysis needs', () => {
    expect(out).toContain('$195,000')
    expect(out).toContain('Seattle, WA')
    expect(out).toContain('NORTHWIND LABS')
  })
})

describe('guardrails', () => {
  it('flags guarantees, deception and coercion in generated content', () => {
    expect(checkGuardrails({ a: 'You are guaranteed to get this.' })).toContain('guarantee')
    expect(checkGuardrails(['Say you have another offer.'])).toContain('deception')
    expect(checkGuardrails('Take it or leave it.')).toContain('coercion')
    expect(checkGuardrails({ ok: 'A clear, specific ask often works well.' })).toEqual([])
  })

  it('allows responsible phrasing in coach replies', () => {
    expect(checkConversationalText('I can’t guarantee an outcome, and don’t bluff about other offers.')).toEqual([])
    expect(checkConversationalText('You should pretend you have another offer.')).toContain('deception')
  })
})
