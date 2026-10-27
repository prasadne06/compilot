import type { BandSignal, CompanyStage, EmploymentStatus, JobLevel, LeverageSituation, Priority, WorkArrangement } from '../types'
import { INDUSTRIES, LEVELS, LOCATIONS, ROLE_FAMILIES, STAGES } from './benchmarks'

export interface Option<T extends string = string> {
  value: T
  label: string
  hint?: string
}

export const LEVEL_OPTIONS: Option<JobLevel>[] = (Object.keys(LEVELS) as JobLevel[]).map((k) => ({
  value: k,
  label: LEVELS[k].label,
}))

export const LOCATION_OPTIONS: Option[] = LOCATIONS.map((l) => ({ value: l.id, label: l.label }))
export const INDUSTRY_OPTIONS: Option[] = INDUSTRIES.map((i) => ({ value: i.id, label: i.label }))
export const STAGE_OPTIONS: Option<CompanyStage>[] = (Object.keys(STAGES) as CompanyStage[]).map((k) => ({
  value: k,
  label: STAGES[k].label,
}))

export const ARRANGEMENT_OPTIONS: Option<WorkArrangement>[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'Onsite' },
]

export const EMPLOYMENT_OPTIONS: Option<EmploymentStatus>[] = [
  { value: 'employed', label: 'Employed full-time' },
  { value: 'contract', label: 'Contracting / freelance' },
  { value: 'unemployed', label: 'Between roles' },
  { value: 'student', label: 'Student / new graduate' },
]

export const TITLE_SUGGESTIONS = [
  'Senior Product Designer',
  'Senior Software Engineer',
  'Staff Software Engineer',
  'Product Manager',
  'Senior Product Manager',
  'Data Scientist',
  'Engineering Manager',
  'Machine Learning Engineer',
  'UX Researcher',
  'Design Manager',
  'Site Reliability Engineer',
  'Marketing Manager',
  'Account Executive',
  ...ROLE_FAMILIES.map((r) => r.label),
]

export const SITUATION_OPTIONS: Option<LeverageSituation>[] = [
  { value: 'none', label: 'No competing offer', hint: 'This is my only active process' },
  { value: 'interviewing', label: 'Interviewing elsewhere', hint: 'Active processes, no offer yet' },
  { value: 'verbal_offer', label: 'Verbal offer elsewhere', hint: 'Numbers discussed, not in writing' },
  { value: 'written_offer', label: 'Written competing offer', hint: 'A formal offer in hand' },
  { value: 'multiple_offers', label: 'Multiple offers', hint: 'Two or more offers in hand' },
  { value: 'internal_promotion', label: 'Internal promotion', hint: 'My current employer is offering a step up' },
  { value: 'recruiter_outreach', label: 'Recruiter reached out to me', hint: 'They initiated contact' },
  { value: 'not_looking', label: 'I am not actively looking', hint: 'Staying put is a real option' },
]

export const PRIORITY_OPTIONS: Option<Priority>[] = [
  { value: 'base', label: 'Higher base salary' },
  { value: 'total_comp', label: 'Higher total compensation' },
  { value: 'equity', label: 'Equity upside' },
  { value: 'stability', label: 'Job stability' },
  { value: 'growth', label: 'Career growth' },
  { value: 'title', label: 'Title' },
  { value: 'remote', label: 'Remote flexibility' },
  { value: 'wlb', label: 'Work-life balance' },
  { value: 'learning', label: 'Learning opportunities' },
  { value: 'brand', label: 'Company brand' },
  { value: 'benefits', label: 'Benefits' },
]

export const BAND_OPTIONS: Option<BandSignal>[] = [
  { value: 'unknown', label: "I don't know" },
  { value: 'flexible', label: 'They signaled flexibility' },
  { value: 'fixed', label: 'They said the band is fixed' },
]

export const VESTING_OPTIONS: Option[] = [
  { value: '1', label: '1 year' },
  { value: '2', label: '2 years' },
  { value: '3', label: '3 years' },
  { value: '4', label: '4 years' },
  { value: '5', label: '5 years' },
]

export function labelFor<T extends string>(options: Option<T>[], value: T | '' | undefined): string {
  return options.find((o) => o.value === value)?.label ?? ''
}
