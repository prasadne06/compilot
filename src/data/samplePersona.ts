import type { EvaluationInputs } from '../types'

// Demo persona used for the guided sample experience.
export const SAMPLE_PERSONA: EvaluationInputs = {
  profile: {
    jobTitle: 'Senior Product Designer',
    level: 'senior',
    yearsExperience: 11,
    yearsRelevant: 9,
    location: 'sea',
    workArrangement: 'hybrid',
    industry: 'tech',
    employmentStatus: 'employed',
    currentBase: 175_000,
    currentBonus: 12_000,
    currentEquity: 18_000,
    currentTotalComp: 205_000,
  },
  offer: {
    company: 'Northwind Labs',
    companyStage: 'growth',
    role: 'Senior Product Designer',
    level: 'senior',
    base: 195_000,
    targetBonusPct: 15,
    signingBonus: undefined,
    equityTotal: 120_000,
    vestingYears: 4,
    otherAnnualComp: undefined,
    benefitsNotes: 'Health, dental, vision; 401(k) with match; $1,500 learning stipend',
    ptoDays: 20,
    remotePolicy: 'hybrid',
    startDate: '',
    relocation: undefined,
  },
  leverage: {
    situations: ['written_offer'],
    competing: { company: 'Another growth-stage company', base: 210_000 },
    uniqueExpertise: false,
    bandSignal: 'unknown',
  },
  priorities: ['growth', 'total_comp', 'remote'],
  walkAway: undefined,
}

export const EMPTY_INPUTS: EvaluationInputs = {
  profile: {
    jobTitle: '',
    level: '',
    location: '',
    workArrangement: '',
    industry: '',
    employmentStatus: '',
  },
  offer: {
    company: '',
    companyStage: 'unknown',
    role: '',
    level: '',
    benefitsNotes: '',
    remotePolicy: '',
    startDate: '',
    vestingYears: 4,
  },
  leverage: {
    situations: [],
    competing: { company: '' },
    uniqueExpertise: false,
    bandSignal: 'unknown',
  },
  priorities: [],
}
