export const TALENT_POOL_LIFECYCLE = [
  'active_process',
  'pool_eligible',
  'needs_reconsent',
  'paused',
  'withdrawn',
  'expired'
] as const
export type TalentPoolLifecycle = (typeof TALENT_POOL_LIFECYCLE)[number]

export const TALENT_POOL_PURPOSES = ['active_application', 'future_opportunities'] as const
export type TalentPoolPurpose = (typeof TALENT_POOL_PURPOSES)[number]

export type TalentPoolReasonCode =
  | 'active_application_only'
  | 'future_consent_current'
  | 'future_consent_missing'
  | 'future_consent_expired'
  | 'consent_withdrawn'
  | 'contact_paused'
  | 'evidence_missing'
  | 'evidence_stale'

export interface TalentPoolAccessDecision {
  discoverable: boolean
  contactable: boolean
  allowedActions: Array<'read' | 'update_availability' | 'grant_future_consent' | 'invite' | 'withdraw'>
  reasonCodes: TalentPoolReasonCode[]
}

export interface TalentPoolEvidenceDto {
  sourceType: 'application' | 'opening' | 'assessment_competency'
  sourceRef: string
  applicationRef: string | null
  capabilityKey: string | null
  seniority: string | null
  languageCode: string | null
  countryCode: string | null
  availability: string | null
  evidenceState: 'declared' | 'observed' | 'evaluated'
  resultBand: string | null
  observedAt: string
  freshUntil: string | null
  isStale: boolean
}

export interface TalentPoolProfileDto {
  talentProfileId: string
  displayName: string
  lifecycleStatus: TalentPoolLifecycle
  aggregateVersion: number
  futureConsentExpiresAt: string | null
  availability: string | null
  seniority: string | null
  countryCode: string | null
  access: TalentPoolAccessDecision
  evidenceCoverage: 'none' | 'partial' | 'structured'
  evidenceFreshness: 'none' | 'stale' | 'current'
  evidence: TalentPoolEvidenceDto[]
  updatedAt: string
}

export interface SearchTalentPoolInput {
  query?: string
  capabilityKeys?: string[]
  seniority?: string
  languageCode?: string
  countryCode?: string
  availability?: string
  lifecycle?: TalentPoolLifecycle[]
  cursor?: string
  /** Server-only actor/workload binding. Never accepted from an untrusted query parameter. */
  cursorBinding?: string
  limit?: number
}

export interface SearchTalentPoolResult {
  items: TalentPoolProfileDto[]
  nextCursor: string | null
}
