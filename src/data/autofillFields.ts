import type { AutofillKey } from '../types'
import { ARRANGEMENT_OPTIONS, LEVEL_OPTIONS, LOCATION_OPTIONS, STAGE_OPTIONS, type Option } from './options'

export interface AutofillFieldMeta {
  label: string
  section: 'About you' | 'Your offer'
  kind: 'text' | 'longtext' | 'money' | 'percent' | 'number' | 'date' | 'select'
  options?: Option[]
  suffix?: string
}

export const AUTOFILL_FIELDS: Record<AutofillKey, AutofillFieldMeta> = {
  'profile.jobTitle': { label: 'Your job title', section: 'About you', kind: 'text' },
  'profile.location': { label: 'Location', section: 'About you', kind: 'select', options: LOCATION_OPTIONS },
  'offer.company': { label: 'Company', section: 'Your offer', kind: 'text' },
  'offer.companyStage': { label: 'Company stage', section: 'Your offer', kind: 'select', options: STAGE_OPTIONS.filter((o) => o.value !== 'unknown') },
  'offer.role': { label: 'Role title', section: 'Your offer', kind: 'text' },
  'offer.level': { label: 'Level', section: 'Your offer', kind: 'select', options: LEVEL_OPTIONS },
  'offer.base': { label: 'Base salary', section: 'Your offer', kind: 'money', suffix: '/ yr' },
  'offer.targetBonusPct': { label: 'Target bonus', section: 'Your offer', kind: 'percent', suffix: '%' },
  'offer.signingBonus': { label: 'Signing bonus', section: 'Your offer', kind: 'money' },
  'offer.equityTotal': { label: 'Equity (total grant)', section: 'Your offer', kind: 'money' },
  'offer.vestingYears': { label: 'Vesting period', section: 'Your offer', kind: 'number', suffix: 'years' },
  'offer.otherAnnualComp': { label: 'Other measurable comp', section: 'Your offer', kind: 'money', suffix: '/ yr' },
  'offer.ptoDays': { label: 'PTO', section: 'Your offer', kind: 'number', suffix: 'days' },
  'offer.remotePolicy': { label: 'Remote policy', section: 'Your offer', kind: 'select', options: ARRANGEMENT_OPTIONS },
  'offer.startDate': { label: 'Start date', section: 'Your offer', kind: 'date' },
  'offer.relocation': { label: 'Relocation package', section: 'Your offer', kind: 'money' },
  'offer.benefitsNotes': { label: 'Other benefits', section: 'Your offer', kind: 'longtext' },
}

/** Display order in the review screen. */
export const AUTOFILL_ORDER = Object.keys(AUTOFILL_FIELDS) as AutofillKey[]
