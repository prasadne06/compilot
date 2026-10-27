// ILLUSTRATIVE BENCHMARK DATA
// ------------------------------------------------------------------
// These figures are hand-built modeling assumptions used to demonstrate the
// product. They are NOT sourced from any survey, vendor, or private company data
// and are NOT real-time. Replace with a licensed or crowdsourced dataset before
// treating outputs as market data.

import type { CompanyStage, JobLevel, MatchQuality } from '../types'

export const BENCHMARK_LABEL = 'Illustrative benchmark data'
export const BENCHMARK_VINTAGE = 'Static model assumptions · not real-time'

export interface RoleFamily {
  id: string
  label: string
  // Median base salary at Senior level, US national, technology industry, growth stage.
  referenceBase: number
  demand: 'high' | 'medium' | 'standard'
  keywords: string[]
}

export const ROLE_FAMILIES: RoleFamily[] = [
  { id: 'swe', label: 'Software Engineering', referenceBase: 178_000, demand: 'high', keywords: ['software', 'engineer', 'developer', 'frontend', 'backend', 'full stack', 'fullstack', 'mobile', 'ios', 'android'] },
  { id: 'mle', label: 'Machine Learning / AI', referenceBase: 194_000, demand: 'high', keywords: ['machine learning', 'ml ', 'ml engineer', 'ai engineer', 'research scientist', 'applied scientist', 'llm'] },
  { id: 'sre', label: 'Infrastructure / SRE', referenceBase: 174_000, demand: 'high', keywords: ['sre', 'site reliability', 'devops', 'infrastructure', 'platform engineer', 'cloud'] },
  { id: 'security', label: 'Security Engineering', referenceBase: 180_000, demand: 'high', keywords: ['security', 'appsec', 'infosec'] },
  { id: 'pm', label: 'Product Management', referenceBase: 180_000, demand: 'high', keywords: ['product manager', 'product management', 'pm', 'product owner', 'group product'] },
  { id: 'design', label: 'Product Design', referenceBase: 165_000, demand: 'medium', keywords: ['product designer', 'ux designer', 'ui designer', 'interaction designer', 'designer', 'design'] },
  { id: 'research', label: 'UX Research', referenceBase: 154_000, demand: 'medium', keywords: ['ux research', 'user research', 'researcher'] },
  { id: 'ds', label: 'Data Science', referenceBase: 170_000, demand: 'high', keywords: ['data scientist', 'data science', 'quantitative'] },
  { id: 'da', label: 'Data / Analytics', referenceBase: 128_000, demand: 'medium', keywords: ['data analyst', 'analytics', 'business intelligence', 'bi analyst', 'data engineer'] },
  { id: 'eng_mgmt', label: 'Engineering Management', referenceBase: 192_000, demand: 'medium', keywords: ['engineering manager', 'head of engineering', 'vp engineering', 'director of engineering'] },
  { id: 'design_mgmt', label: 'Design Management', referenceBase: 178_000, demand: 'medium', keywords: ['design manager', 'head of design', 'design director', 'director of design'] },
  { id: 'tpm', label: 'Program Management', referenceBase: 162_000, demand: 'medium', keywords: ['program manager', 'tpm', 'project manager'] },
  { id: 'marketing', label: 'Marketing', referenceBase: 138_000, demand: 'standard', keywords: ['marketing', 'growth', 'brand', 'content', 'demand gen'] },
  { id: 'sales', label: 'Sales (base only)', referenceBase: 122_000, demand: 'standard', keywords: ['account executive', 'sales', 'business development', 'bdr', 'sdr'] },
  { id: 'cs', label: 'Customer Success', referenceBase: 108_000, demand: 'standard', keywords: ['customer success', 'account manager', 'support', 'solutions'] },
  { id: 'finance', label: 'Finance', referenceBase: 125_000, demand: 'standard', keywords: ['finance', 'financial analyst', 'fp&a', 'accountant', 'controller'] },
  { id: 'ops', label: 'Operations', referenceBase: 118_000, demand: 'standard', keywords: ['operations', 'ops', 'chief of staff', 'strategy'] },
]

export const GENERIC_ROLE: RoleFamily = {
  id: 'generic', label: 'General professional (low-specificity fallback)', referenceBase: 135_000, demand: 'standard', keywords: [],
}

export interface LevelInfo {
  label: string
  multiplier: number
  expectedYears: [number, number]
  equityMultiplier: number
}

export const LEVELS: Record<JobLevel, LevelInfo> = {
  entry: { label: 'Entry / Junior', multiplier: 0.62, expectedYears: [0, 2], equityMultiplier: 0.4 },
  mid: { label: 'Mid-level', multiplier: 0.8, expectedYears: [2, 5], equityMultiplier: 0.7 },
  senior: { label: 'Senior', multiplier: 1.0, expectedYears: [5, 10], equityMultiplier: 1 },
  staff: { label: 'Staff / Lead', multiplier: 1.2, expectedYears: [8, 14], equityMultiplier: 1.45 },
  principal: { label: 'Principal', multiplier: 1.4, expectedYears: [12, 20], equityMultiplier: 1.9 },
  manager: { label: 'Manager', multiplier: 1.12, expectedYears: [7, 13], equityMultiplier: 1.25 },
  senior_manager: { label: 'Senior Manager', multiplier: 1.3, expectedYears: [10, 16], equityMultiplier: 1.6 },
  director: { label: 'Director', multiplier: 1.5, expectedYears: [12, 22], equityMultiplier: 2.1 },
}

export interface LocationInfo {
  id: string
  label: string
  factor: number
  match: MatchQuality
}

export const LOCATIONS: LocationInfo[] = [
  { id: 'sf', label: 'San Francisco Bay Area, CA', factor: 1.18, match: 'high' },
  { id: 'nyc', label: 'New York, NY', factor: 1.13, match: 'high' },
  { id: 'sea', label: 'Seattle, WA', factor: 1.1, match: 'high' },
  { id: 'bos', label: 'Boston, MA', factor: 1.05, match: 'high' },
  { id: 'la', label: 'Los Angeles, CA', factor: 1.05, match: 'high' },
  { id: 'sd', label: 'San Diego, CA', factor: 1.01, match: 'medium' },
  { id: 'dc', label: 'Washington, DC', factor: 1.02, match: 'high' },
  { id: 'aus', label: 'Austin, TX', factor: 0.99, match: 'high' },
  { id: 'den', label: 'Denver, CO', factor: 0.98, match: 'medium' },
  { id: 'chi', label: 'Chicago, IL', factor: 0.97, match: 'high' },
  { id: 'pdx', label: 'Portland, OR', factor: 0.96, match: 'medium' },
  { id: 'atl', label: 'Atlanta, GA', factor: 0.94, match: 'medium' },
  { id: 'remote_us', label: 'Remote (US)', factor: 0.96, match: 'medium' },
  { id: 'other_us', label: 'Other US location', factor: 0.88, match: 'medium' },
  { id: 'outside_us', label: 'Outside the US', factor: 0.75, match: 'low' },
]

export interface IndustryInfo {
  id: string
  label: string
  factor: number
  match: MatchQuality
  bonusPct: number
}

export const INDUSTRIES: IndustryInfo[] = [
  { id: 'tech', label: 'Technology / Software', factor: 1.0, match: 'high', bonusPct: 0.1 },
  { id: 'fintech', label: 'Financial services / Fintech', factor: 1.03, match: 'high', bonusPct: 0.15 },
  { id: 'health', label: 'Healthcare / Biotech', factor: 0.93, match: 'medium', bonusPct: 0.1 },
  { id: 'ecommerce', label: 'Retail / E-commerce', factor: 0.95, match: 'medium', bonusPct: 0.1 },
  { id: 'consulting', label: 'Consulting / Agency', factor: 0.92, match: 'medium', bonusPct: 0.1 },
  { id: 'media', label: 'Media / Entertainment', factor: 0.9, match: 'medium', bonusPct: 0.08 },
  { id: 'manufacturing', label: 'Manufacturing / Industrial', factor: 0.88, match: 'low', bonusPct: 0.08 },
  { id: 'education', label: 'Education', factor: 0.82, match: 'low', bonusPct: 0.03 },
  { id: 'public', label: 'Government / Nonprofit', factor: 0.8, match: 'low', bonusPct: 0.02 },
  { id: 'other', label: 'Other', factor: 0.92, match: 'low', bonusPct: 0.08 },
]

export interface StageInfo {
  label: string
  baseFactor: number
  bonusAdj: number // multiplier on industry bonus norm
  equityRatio: number // typical annual equity as fraction of base at Senior level
  liquid: boolean
  bandNote: string
}

export const STAGES: Record<CompanyStage, StageInfo> = {
  early: { label: 'Early-stage startup', baseFactor: 0.92, bonusAdj: 0.3, equityRatio: 0.25, liquid: false, bandNote: 'Early-stage companies often have less cash flexibility but more room on equity.' },
  growth: { label: 'Growth-stage company', baseFactor: 1.0, bonusAdj: 1, equityRatio: 0.18, liquid: false, bandNote: 'Growth-stage companies usually have defined bands with some flexibility within them.' },
  late: { label: 'Late-stage / pre-IPO', baseFactor: 1.03, bonusAdj: 1, equityRatio: 0.24, liquid: false, bandNote: 'Late-stage companies often have structured bands and some flexibility on equity.' },
  public: { label: 'Public technology company', baseFactor: 1.07, bonusAdj: 1.3, equityRatio: 0.38, liquid: true, bandNote: 'Large public companies typically use structured levels and bands; equity and sign-on are often more flexible than base.' },
  enterprise: { label: 'Established enterprise (non-tech)', baseFactor: 0.96, bonusAdj: 1, equityRatio: 0.06, liquid: true, bandNote: 'Established enterprises often negotiate on base, bonus and sign-on rather than equity.' },
  unknown: { label: 'Company stage not specified', baseFactor: 1.0, bonusAdj: 1, equityRatio: 0.15, liquid: false, bandNote: 'Company stage was not provided, so equity norms are less certain.' },
}

// Percentile spread around the median. Widened when confidence is lower.
export const SPREAD = { low: 0.84, p25: 0.92, p75: 1.08, high: 1.17 }
