// Core domain types for CompPilot.
// Business logic (engine/) and AI services (services/ai/) both depend on these;
// UI components only consume them.

export type JobLevel =
  | 'entry'
  | 'mid'
  | 'senior'
  | 'staff'
  | 'principal'
  | 'manager'
  | 'senior_manager'
  | 'director'

export type WorkArrangement = 'remote' | 'hybrid' | 'onsite'

export type EmploymentStatus = 'employed' | 'unemployed' | 'student' | 'contract'

export type CompanyStage = 'early' | 'growth' | 'late' | 'public' | 'enterprise' | 'unknown'

export type LeverageSituation =
  | 'none'
  | 'interviewing'
  | 'verbal_offer'
  | 'written_offer'
  | 'multiple_offers'
  | 'internal_promotion'
  | 'recruiter_outreach'
  | 'not_looking'

export type Priority =
  | 'base'
  | 'total_comp'
  | 'equity'
  | 'stability'
  | 'growth'
  | 'title'
  | 'remote'
  | 'wlb'
  | 'learning'
  | 'brand'
  | 'benefits'

export type BandSignal = 'fixed' | 'flexible' | 'unknown'

export interface UserProfile {
  jobTitle: string
  level: JobLevel | ''
  yearsExperience?: number
  yearsRelevant?: number
  location: string
  workArrangement: WorkArrangement | ''
  industry: string
  employmentStatus: EmploymentStatus | ''
  currentBase?: number
  currentBonus?: number
  currentEquity?: number // annual value
  currentTotalComp?: number // optional override
}

export interface Offer {
  company: string
  companyStage: CompanyStage
  role: string
  level: JobLevel | ''
  base?: number
  targetBonusPct?: number
  signingBonus?: number
  equityTotal?: number
  vestingYears?: number
  otherAnnualComp?: number // 401k match, stipends — anything with measurable annual value
  benefitsNotes: string
  ptoDays?: number
  remotePolicy: WorkArrangement | ''
  startDate: string
  relocation?: number
}

export interface CompetingOffer {
  company: string
  base?: number
  totalComp?: number
}

export interface LeverageInputs {
  situations: LeverageSituation[]
  competing: CompetingOffer
  uniqueExpertise: boolean
  bandSignal: BandSignal
}

export interface EvaluationInputs {
  profile: UserProfile
  offer: Offer
  leverage: LeverageInputs
  priorities: Priority[] // ordered, index 0 = most important
  walkAway?: number // user-defined only — never computed
}

// ---------- Deterministic engine outputs ----------

export interface Compensation {
  base: number
  expectedBonus: number
  annualEquity: number
  otherAnnual: number
  signingBonus: number
  cashCompensation: number // base + bonus + other (recurring)
  totalCompensation: number // cash + annualized equity (recurring)
  firstYearTotal: number // total + signing
  equityShare: number // equity / total
  currentTotalComp?: number
  changeVsCurrent?: number // fraction, e.g. 0.24
  equityIsLiquid: boolean
}

export interface MarketRange {
  low: number // ~10th percentile
  p25: number
  median: number
  p75: number
  high: number // ~90th percentile
}

export type MatchQuality = 'high' | 'medium' | 'low'

export interface Benchmark {
  roleFamily: string
  roleFamilyLabel: string
  roleMatch: MatchQuality
  level: JobLevel
  locationLabel: string
  locationMatch: MatchQuality
  industryLabel: string
  industryMatch: MatchQuality
  stageLabel: string
  base: MarketRange
  totalComp: MarketRange
  typicalBonusPct: number
  typicalEquityAnnual: number
  demand: 'high' | 'medium' | 'standard'
  source: 'illustrative'
  methodology: string[]
}

export interface ScoreComponent {
  label: string
  weight: number
  score: number // 0-100
  detail: string
}

export interface OfferScore {
  score: number
  components: ScoreComponent[]
}

export interface MarketPosition {
  basePercentile: number
  totalCompPercentile: number
  baseVsMedian: number // fraction
  label: string
}

export interface LeverageFactor {
  label: string
  points: number
  detail: string
  kind: 'strength' | 'weakness'
}

export interface NegotiationLeverage {
  score: number
  label: 'Limited' | 'Moderate' | 'Strong' | 'Very strong'
  factors: LeverageFactor[]
}

export interface ConfidenceFactor {
  label: string
  rating: MatchQuality
  detail: string
}

export interface Confidence {
  score: number // 0-100
  label: MatchQuality
  factors: ConfidenceFactor[]
}

export type RecommendationState = 'strong' | 'consider' | 'negotiate' | 'below'

export interface Recommendation {
  state: RecommendationState
  headline: string
  target: number
  rangeLow: number
  rangeHigh: number
  fallback: number
  rationale: string[]
}

export type AskType =
  | 'base'
  | 'equity'
  | 'signing'
  | 'bonus'
  | 'level_review'
  | 'title'
  | 'remote'
  | 'pto'
  | 'start_date'

export interface StrategyAsk {
  type: AskType
  label: string
  detail: string
}

export interface NegotiationStrategy {
  primary: StrategyAsk
  secondary: StrategyAsk
  fallback: StrategyAsk
  nonCash?: StrategyAsk
  avoid: string[]
  why: string[]
  sequencing: string[]
}

export interface Analysis {
  compensation: Compensation
  benchmark: Benchmark
  offerScore: OfferScore
  marketPosition: MarketPosition
  leverage: NegotiationLeverage
  confidence: Confidence
  recommendation: Recommendation
  strategy: NegotiationStrategy
}

// ---------- AI service outputs (structured JSON) ----------

export interface AINarrative {
  summary: string
  keyTakeaways: string[]
  recommendationExplanation: string
  leverageExplanation: string
  caveats: string[]
}

export type ScriptChannel = 'recruiter_call' | 'email' | 'hiring_manager' | 'short' | 'collaborative' | 'assertive'

export interface NegotiationScript {
  id: ScriptChannel
  title: string
  format: 'spoken' | 'written'
  tone: string
  whenToUse: string
  subject?: string
  body: string
  keyMoves: string[]
}

export interface PushbackScenario {
  id: string
  objection: string
  response: string
  alternativeAsk: string
  rationale: string
}

export type PracticeScenarioId = 'top_of_range' | 'fixed_band' | 'equity_instead' | 'best_offer'

export interface ResponseFeedback {
  score: number // 0-10
  strengths: string[]
  improvements: string[]
  improvedVersion: string
}

export interface PracticeTurn {
  role: 'recruiter' | 'user'
  text: string
  feedback?: ResponseFeedback
}

export interface PracticeSession {
  scenario: PracticeScenarioId
  turns: PracticeTurn[]
  round: number
  maxRounds: number
  complete: boolean
}

// ---------- Offer letter autofill ----------

export type AutofillKey =
  | 'profile.jobTitle'
  | 'profile.location'
  | 'offer.company'
  | 'offer.companyStage'
  | 'offer.role'
  | 'offer.level'
  | 'offer.base'
  | 'offer.targetBonusPct'
  | 'offer.signingBonus'
  | 'offer.equityTotal'
  | 'offer.vestingYears'
  | 'offer.otherAnnualComp'
  | 'offer.ptoDays'
  | 'offer.remotePolicy'
  | 'offer.startDate'
  | 'offer.relocation'
  | 'offer.benefitsNotes'

export interface ExtractedField {
  key: AutofillKey
  value: string | number
  confidence: MatchQuality
  evidence: string // the sentence the value was found in
  note?: string // e.g. an assumption or conversion we made
}

export interface OfferExtraction {
  fields: ExtractedField[]
  warnings: string[]
}

export interface AutofillSource {
  evidence: string
  confidence: MatchQuality
  note?: string
}

export interface AutofillState {
  fileName: string
  filledKeys: AutofillKey[] // everything that was filled
  pendingKeys: AutofillKey[] // filled but not yet confirmed or edited by the user
  sources: Partial<Record<AutofillKey, AutofillSource>> // where each value came from
  warnings: string[] // things the letter didn't state clearly
}
