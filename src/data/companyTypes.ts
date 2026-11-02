import type { CompanyStage } from '../types'

/** Plain-language company types shown on the offer form. "late" (pre-IPO) is folded into Scale-up. */
export interface CompanyTypeInfo {
  value: Exclude<CompanyStage, 'late' | 'unknown'>
  label: string
  summary: string
  pay: string
  examples: string
}

export const COMPANY_TYPES: CompanyTypeInfo[] = [
  {
    value: 'early',
    label: 'Startup',
    summary: 'A young company, usually under ~200 people, funded by investors (seed to Series B).',
    pay: 'Often lower base, plus stock options that may or may not become valuable.',
    examples: 'Most companies you haven’t heard of yet, e.g. a 30-person AI startup that just raised its first rounds.',
  },
  {
    value: 'growth',
    label: 'Scale-up',
    summary: 'A fast-growing, well-funded private company (Series C or later), sometimes preparing to go public.',
    pay: 'Competitive base, plus equity that usually can’t be sold until the company goes public or is acquired.',
    examples: 'e.g. Stripe, Databricks, Canva',
  },
  {
    value: 'public',
    label: 'Big tech / public company',
    summary: 'A large tech company whose shares trade on the stock market.',
    pay: 'Higher base and bonus, plus stock (RSUs) you can sell as it vests.',
    examples: 'e.g. Google, Microsoft, Amazon, Salesforce, Adobe',
  },
  {
    value: 'enterprise',
    label: 'Non-tech company',
    summary: 'An established company outside the tech industry that hires for tech, product or design roles.',
    pay: 'Steady base and bonus; little or no equity.',
    examples: 'e.g. JPMorgan Chase, Walmart, UnitedHealth Group, Target',
  },
]

/** The picker's value for a stored stage (older saves may hold "late"). */
export const companyTypeValue = (stage: CompanyStage): CompanyStage => (stage === 'late' ? 'growth' : stage)
