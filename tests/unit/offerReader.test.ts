import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseOfferText } from '../../src/services/ai/offerExtraction'

// Fictional letters (text as the app's PDF/Word reader produces it). Each case pins down
// what the rule-based reader must find, so parser changes can't silently regress.
const letter = (name: string) => readFileSync(new URL(`../fixtures/letters/${name}.txt`, import.meta.url), 'utf8')
const fields = (name: string) => {
  const r = parseOfferText(letter(name))
  return { values: Object.fromEntries(r.fields.map((f) => [f.key, f.value])), warnings: r.warnings, raw: r.fields }
}

describe('offer letter reader', () => {
  it('reads the Northwind sample (PDF)', () => {
    expect(fields('sample-offer-letter').values).toEqual({
      'offer.company': 'Northwind Labs',
      'offer.role': 'Senior Product Designer',
      'profile.jobTitle': 'Senior Product Designer',
      'offer.level': 'senior',
      'offer.base': 195000,
      'offer.targetBonusPct': 15,
      'offer.equityTotal': 120000,
      'offer.vestingYears': 4,
      'offer.otherAnnualComp': 1500,
      'offer.ptoDays': 20,
      'offer.remotePolicy': 'hybrid',
      'profile.location': 'sea',
      'offer.startDate': '2026-12-01',
      'offer.companyStage': 'growth',
      'offer.benefitsNotes': 'Medical, dental, vision; 401(k) with 4% match; 16 weeks parental leave; $1,500 learning stipend',
    })
  })

  it('reads the Halcyon sample (Word) and flags unlimited PTO', () => {
    const { values, warnings } = fields('sample-offer-letter-2')
    expect(values).toMatchObject({
      'offer.company': 'Halcyon Health', 'offer.level': 'staff', 'offer.base': 232500, 'offer.targetBonusPct': 20,
      'offer.signingBonus': 25000, 'offer.equityTotal': 260000, 'offer.companyStage': 'public', 'profile.location': 'remote_us',
    })
    expect(values['offer.ptoDays']).toBeUndefined()
    expect(warnings.join(' ')).toMatch(/unlimited PTO/)
  })

  it('reads a public-company PM letter in New York', () => {
    expect(fields('1-meridian-product-manager-nyc').values).toMatchObject({
      'offer.company': 'Meridian Systems', 'offer.base': 205000, 'offer.signingBonus': 30000, 'offer.equityTotal': 280000,
      'offer.ptoDays': 25, 'offer.relocation': 15000, 'profile.location': 'nyc', 'offer.companyStage': 'public',
    })
  })

  it('does not invent a dollar value for equity given in units', () => {
    const { values, warnings } = fields('2-sprout-ai-engineer-remote')
    expect(values).toMatchObject({ 'offer.company': 'Sprout AI', 'offer.base': 165000, 'offer.companyStage': 'early' })
    expect(values['offer.equityTotal']).toBeUndefined()
    expect(warnings.join(' ')).toMatch(/40,000 units/)
  })

  it('reads a small-company letter without equity', () => {
    expect(fields('3-lakeshore-data-analyst-chicago').values).toMatchObject({
      'offer.company': 'Lakeshore Logistics', 'offer.base': 75000, 'offer.targetBonusPct': 5, 'offer.remotePolicy': 'onsite', 'profile.location': 'chi',
    })
  })

  it('annualises an hourly rate', () => {
    const { values, raw } = fields('4-brightpath-ux-designer-hourly-austin')
    expect(values['offer.base']).toBe(149760) // $72/hr × 2,080 hours
    expect(raw.find((f) => f.key === 'offer.base')?.note).toBeTruthy()
  })

  it('warns on a non-US letter and does not read pounds as dollars', () => {
    const { values, warnings } = fields('uk-letter')
    expect(values['offer.base']).toBeUndefined()
    expect(warnings.join(' ')).toMatch(/non-US offer/)
  })

  it('finds nothing in a document that is not an offer', () => {
    const { raw, warnings } = fields('grocery')
    expect(raw).toHaveLength(0)
    expect(warnings.join(' ')).toMatch(/couldn’t find a base salary/)
  })

  it('keeps evidence short and never uses the letterhead address', () => {
    for (const name of ['sample-offer-letter', 'sample-offer-letter-2', '1-meridian-product-manager-nyc', '3-lakeshore-data-analyst-chicago']) {
      for (const f of fields(name).raw) {
        expect(f.evidence.length, `${name} ${f.key}`).toBeLessThanOrEqual(220)
        expect(f.evidence, `${name} ${f.key}`).not.toMatch(/\b\d{3,5} \w+ (Avenue|Street)\b/)
      }
    }
  })
})

describe('checking letter values found by Claude', () => {
  it('keeps quoted values, drops made-up ones, and fills gaps from the built-in reader', async () => {
    const { checkAIExtraction } = await import('../../src/services/ai/offerExtraction')
    const text = letter('sample-offer-letter')
    const local = parseOfferText(text)
    const checked = checkAIExtraction(
      {
        fields: [
          { key: 'offer.base', value: 199000, confidence: 'high', evidence: 'Your annual base salary will be $199,000' }, // not in the letter
          { key: 'offer.company', value: 'Northwind Labs', confidence: 'high', evidence: 'On behalf of Northwind Labs, Inc., I am delighted to offer you the position of Senior Product Designer' },
          { key: 'offer.made_up' as never, value: 1, confidence: 'high', evidence: 'On behalf of Northwind Labs' },
        ],
        warnings: [],
      },
      text,
      local,
    )
    const values = Object.fromEntries(checked.fields.map((f) => [f.key, f.value]))
    expect(values['offer.base']).toBe(195000) // from the built-in reader
    expect(values['offer.company']).toBe('Northwind Labs')
    expect(values).not.toHaveProperty('offer.made_up')
    expect(checked.fields).toHaveLength(local.fields.length)
  })
})
