// TASK-353 — Hiring / ATS domain foundation.
// Tipos de dominio (view models camelCase + enums que espejan los CHECK constraints de
// greenhouse_hiring). Arch: GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md.
// Person-first: candidate_facet + hiring_application anclan a identity_profile_id.

// ── Enums (1:1 con los CHECK del schema) ──

export const TALENT_DEMAND_STAKEHOLDER_TYPES = ['internal', 'client'] as const
export type TalentDemandStakeholderType = (typeof TALENT_DEMAND_STAKEHOLDER_TYPES)[number]

export const TALENT_DEMAND_ENGAGEMENT_TYPES = ['on_demand', 'on_going'] as const
export type TalentDemandEngagementType = (typeof TALENT_DEMAND_ENGAGEMENT_TYPES)[number]

export const HIRING_FULFILLMENT_MODES = [
  'internal_reassignment',
  'internal_hire',
  'staff_augmentation',
  'contractor',
  'partner',
] as const
export type HiringFulfillmentMode = (typeof HIRING_FULFILLMENT_MODES)[number]

export const TALENT_DEMAND_ORIGINS = [
  'client_request',
  'prospect_request',
  'replacement',
  'expansion',
  'capacity_gap',
  'manual_internal',
] as const
export type TalentDemandOrigin = (typeof TALENT_DEMAND_ORIGINS)[number]

export const TALENT_DEMAND_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export type TalentDemandPriority = (typeof TALENT_DEMAND_PRIORITIES)[number]

export const TALENT_DEMAND_STATUSES = [
  'draft',
  'qualified',
  'open',
  'sourcing',
  'partially_fulfilled',
  'fulfilled',
  'stalled',
  'cancelled',
  'archived',
] as const
export type TalentDemandStatus = (typeof TALENT_DEMAND_STATUSES)[number]

export const HIRING_OPENING_VISIBILITIES = ['internal_only', 'private_sourcing', 'public_listed'] as const
export type HiringOpeningVisibility = (typeof HIRING_OPENING_VISIBILITIES)[number]

export const HIRING_OPENING_PUBLICATION_STATUSES = [
  'draft',
  'ready_for_review',
  'published',
  'paused',
  'closed',
] as const
export type HiringOpeningPublicationStatus = (typeof HIRING_OPENING_PUBLICATION_STATUSES)[number]

export const HIRING_OPENING_STATUSES = ['draft', 'active', 'paused', 'filled', 'cancelled', 'closed'] as const
export type HiringOpeningStatus = (typeof HIRING_OPENING_STATUSES)[number]

export const CANDIDATE_SOURCES = [
  'public_careers',
  'manual',
  'referral',
  'bench_internal',
  'partner',
  'hubspot',
  'import',
] as const
export type CandidateSource = (typeof CANDIDATE_SOURCES)[number]

export const CANDIDATE_READINESS = ['unknown', 'not_ready', 'passive', 'active', 'ready'] as const
export type CandidateReadiness = (typeof CANDIDATE_READINESS)[number]

export const CANDIDATE_CONSENT_STATUSES = ['not_captured', 'granted', 'withdrawn'] as const
export type CandidateConsentStatus = (typeof CANDIDATE_CONSENT_STATUSES)[number]

export const CANDIDATE_FACET_STATUSES = ['active', 'archived'] as const
export type CandidateFacetStatus = (typeof CANDIDATE_FACET_STATUSES)[number]

export const HIRING_APPLICATION_STAGES = [
  'sourced',
  'screening',
  'qualified',
  'shortlisted',
  'client_review',
  'interview',
  'decision_pending',
  'selected',
  'backup',
  'rejected',
  'withdrawn',
  'handoff_ready',
  'closed',
] as const
export type HiringApplicationStage = (typeof HIRING_APPLICATION_STAGES)[number]

export const HIRING_DECISIONS = ['selected', 'backup_selected', 'rejected', 'withdrawn', 'on_hold'] as const
export type HiringDecision = (typeof HIRING_DECISIONS)[number]

// ── View models (camelCase, retornados por el store) ──

export interface TalentDemand {
  demandId: string
  publicId: string
  stakeholderType: TalentDemandStakeholderType
  engagementType: TalentDemandEngagementType
  fulfillmentMode: HiringFulfillmentMode
  demandOrigin: TalentDemandOrigin
  organizationId: string | null
  clientId: string | null
  spaceId: string | null
  businessUnit: string | null
  serviceId: string | null
  prospectRef: string | null
  dealRef: string | null
  externalAccountRef: string | null
  requestedCompanyName: string | null
  requestedRole: string
  requestedSeats: number
  requestedSkills: string[]
  targetStartDate: string | null
  priority: TalentDemandPriority
  duration: string | null
  timezone: string | null
  language: string | null
  budgetBand: string | null
  rateBand: string | null
  status: TalentDemandStatus
  ownerUserId: string | null
  notes: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface HiringOpening {
  openingId: string
  publicId: string
  demandId: string
  internalTitle: string
  seniority: string | null
  requestedSeats: number
  ownerUserId: string | null
  spaceId: string | null
  organizationId: string | null
  budgetBand: string | null
  rateBand: string | null
  riskNotes: string | null
  internalNotes: string | null
  visibility: HiringOpeningVisibility
  publicationStatus: HiringOpeningPublicationStatus
  publicTitle: string | null
  publicSummary: string | null
  publicDescription: string | null
  publicRequirements: string | null
  publicNiceToHave: string | null
  publicLocationMode: string | null
  publicEmploymentMode: string | null
  publicSeniority: string | null
  publicProcessNotes: string | null
  applyUrl: string | null
  status: HiringOpeningStatus
  publishedAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface CandidateFacet {
  candidateFacetId: string
  publicId: string
  identityProfileId: string
  memberId: string | null
  source: CandidateSource
  readiness: CandidateReadiness
  availability: string | null
  seniority: string | null
  expectedRate: number | null
  expectedRateCurrency: string | null
  rateBand: string | null
  consentStatus: CandidateConsentStatus
  consentPolicyVersion: string | null
  consentCapturedAt: string | null
  retentionPolicy: string | null
  sourceAttribution: string | null
  verificationSignals: Record<string, unknown>
  portfolioUrl: string | null
  linkedinUrl: string | null
  status: CandidateFacetStatus
  notes: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface HiringApplication {
  applicationId: string
  publicId: string
  openingId: string
  identityProfileId: string
  candidateFacetId: string
  ownerUserId: string | null
  stage: HiringApplicationStage
  score: number | null
  matchScore: number | null
  blockingIssues: string[]
  nextStepAt: string | null
  source: CandidateSource
  notes: string | null
  explainability: Record<string, unknown>
  dedupeFingerprint: string | null
  decision: HiringDecision | null
  decisionAt: string | null
  decisionBy: string | null
  selectedDestination: HiringFulfillmentMode | null
  tentativeStartDate: string | null
  expectedLegalEntity: string | null
  expectedContext: string | null
  prerequisitesSnapshot: Record<string, unknown>
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

// ── Public opening projection (allowlist-only — consumido por TASK-354 careers) ──
// NUNCA incluye owner, budget/rate, risk, notes internos, score ni cliente confidencial.

export interface PublicOpeningPayload {
  publicId: string
  title: string
  summary: string | null
  description: string | null
  requirements: string | null
  niceToHave: string | null
  locationMode: string | null
  employmentMode: string | null
  seniority: string | null
  processNotes: string | null
  applyUrl: string | null
  publishedAt: string | null
}

// ── Input types (commands del store) ──

export interface CreateTalentDemandInput {
  stakeholderType: TalentDemandStakeholderType
  engagementType: TalentDemandEngagementType
  fulfillmentMode: HiringFulfillmentMode
  demandOrigin: TalentDemandOrigin
  requestedRole: string
  requestedSeats?: number
  requestedSkills?: string[]
  organizationId?: string | null
  clientId?: string | null
  spaceId?: string | null
  businessUnit?: string | null
  serviceId?: string | null
  prospectRef?: string | null
  dealRef?: string | null
  externalAccountRef?: string | null
  requestedCompanyName?: string | null
  targetStartDate?: string | null
  priority?: TalentDemandPriority
  duration?: string | null
  timezone?: string | null
  language?: string | null
  budgetBand?: string | null
  rateBand?: string | null
  ownerUserId?: string | null
  notes?: string | null
}

export interface UpdateTalentDemandInput {
  status?: TalentDemandStatus
  requestedRole?: string
  requestedSeats?: number
  requestedSkills?: string[]
  priority?: TalentDemandPriority
  targetStartDate?: string | null
  duration?: string | null
  timezone?: string | null
  language?: string | null
  budgetBand?: string | null
  rateBand?: string | null
  ownerUserId?: string | null
  notes?: string | null
}

export interface CreateHiringOpeningInput {
  demandId: string
  internalTitle: string
  seniority?: string | null
  requestedSeats?: number
  ownerUserId?: string | null
  spaceId?: string | null
  organizationId?: string | null
  budgetBand?: string | null
  rateBand?: string | null
  riskNotes?: string | null
  internalNotes?: string | null
}

export interface UpdateHiringOpeningInput {
  internalTitle?: string
  seniority?: string | null
  requestedSeats?: number
  ownerUserId?: string | null
  budgetBand?: string | null
  rateBand?: string | null
  riskNotes?: string | null
  internalNotes?: string | null
  status?: HiringOpeningStatus
  visibility?: HiringOpeningVisibility
  // Payload público editable (la publicación se gobierna aparte con publish/unpublish).
  publicTitle?: string | null
  publicSummary?: string | null
  publicDescription?: string | null
  publicRequirements?: string | null
  publicNiceToHave?: string | null
  publicLocationMode?: string | null
  publicEmploymentMode?: string | null
  publicSeniority?: string | null
  publicProcessNotes?: string | null
  applyUrl?: string | null
}

export interface ReconcileCandidateFacetInput {
  identityProfileId: string
  source?: CandidateSource
  readiness?: CandidateReadiness
  availability?: string | null
  seniority?: string | null
  expectedRate?: number | null
  expectedRateCurrency?: string | null
  rateBand?: string | null
  consentStatus?: CandidateConsentStatus
  consentPolicyVersion?: string | null
  consentCapturedAt?: string | null
  retentionPolicy?: string | null
  sourceAttribution?: string | null
  portfolioUrl?: string | null
  linkedinUrl?: string | null
  memberId?: string | null
  notes?: string | null
}

export interface CreateHiringApplicationInput {
  openingId: string
  identityProfileId: string
  candidateFacetId: string
  ownerUserId?: string | null
  stage?: HiringApplicationStage
  source?: CandidateSource
  score?: number | null
  matchScore?: number | null
  blockingIssues?: string[]
  nextStepAt?: string | null
  notes?: string | null
  dedupeFingerprint?: string | null
}

export interface ListTalentDemandFilters {
  status?: TalentDemandStatus
  stakeholderType?: TalentDemandStakeholderType
  organizationId?: string
  spaceId?: string
  ownerUserId?: string
  limit?: number
  offset?: number
}

export interface ListHiringOpeningFilters {
  demandId?: string
  status?: HiringOpeningStatus
  publicationStatus?: HiringOpeningPublicationStatus
  visibility?: HiringOpeningVisibility
  limit?: number
  offset?: number
}

export interface ListHiringApplicationFilters {
  openingId?: string
  identityProfileId?: string
  stage?: HiringApplicationStage
  source?: CandidateSource
  limit?: number
  offset?: number
}
