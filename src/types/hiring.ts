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

export const HIRING_PUBLIC_WORK_MODES = ['remote', 'hybrid', 'onsite'] as const
export type HiringPublicWorkMode = (typeof HIRING_PUBLIC_WORK_MODES)[number]

export const HIRING_PUBLIC_AREAS = [
  'Marketing',
  'Growth',
  'Creative',
  'Technology',
  'Operations',
  'People',
  'Finance',
  'Sales',
  'Strategy',
] as const
export type HiringPublicArea = (typeof HIRING_PUBLIC_AREAS)[number]

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
  publicWorkMode: HiringPublicWorkMode | null
  publicHiringRegion: string | null
  publicCity: string | null
  publicCountry: string | null
  publicOfficeLocation: string | null
  publicArea: string | null
  publicSkillTags: string[]
  publicCompensationBand: string | null
  publicationSourceRef: string | null
  publicEmploymentMode: string | null
  publicSeniority: string | null
  publicProcessNotes: string | null
  /** TASK-1740 — contenido público estructurado versionado; null = opening legacy. */
  publicContent: PublicOpeningContent | null
  /** TASK-1740 — países elegibles ISO alpha-2 para schema remoto. */
  publicRemoteEligibleCountries: string[]
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
  /** TASK-1688 — teléfono E.164 opcional (PII interna; nunca en payloads públicos). */
  phoneE164: string | null
  /** TASK-1688 — país de residencia AUTODECLARADO (ISO 3166-1 alpha-2); null = no informado. */
  residenceCountryCode: string | null
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
  /** TASK-1688 — mensaje del candidato, application-scoped (≤4000); PII interna. */
  candidateMessage: string | null
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

/**
 * Razón humana y defendible de una decisión. El score/AI puede aportar evidencia,
 * pero nunca sustituye este juicio explícito del operador.
 */
export interface HiringDecisionReason {
  summary: string
  evidence?: string[]
  overridesAdvisory?: boolean
}

export interface HiringDecisionHistoryEntry {
  decisionId: string
  idempotencyKey: string
  decision: HiringDecision
  decidedAt: string
  decidedBy: string | null
  reason: HiringDecisionReason
  selectedDestination: HiringFulfillmentMode | null
  tentativeStartDate: string | null
  expectedLegalEntity: string | null
  expectedContext: string | null
  prerequisitesSnapshot: Record<string, unknown>
  supersedesDecisionId: string | null
}

export interface HiringDeskOpeningSummary {
  opening: HiringOpening
  demand: TalentDemand
  applicationCount: number
  activeApplicationCount: number
}

export interface HiringDeskApplicationSummary {
  application: HiringApplication
  candidateName: string
  candidateInitials: string
  maskedEmail: string | null
  portfolioUrl: string | null
  linkedinUrl: string | null
  /** TASK-1688 — contacto durable del facet; null = "No informado" (legacy sin backfill). */
  phoneE164: string | null
  residenceCountryCode: string | null
  openingTitle: string
  openingPublicId: string
  area: string | null
}

export interface HiringDeskSnapshot {
  openings: HiringDeskOpeningSummary[]
  applications: HiringDeskApplicationSummary[]
  totals: {
    openings: number
    applications: number
    publishedOpenings: number
    activeDemands: number
  }
}

// ── Public opening structured content (TASK-1740) ──
// Bloque candidate-facing versionado; el validador canónico vive en
// src/lib/hiring/public-careers/public-content.ts.

export const PUBLIC_OPENING_CONTENT_VERSION = 1 as const

export const PUBLIC_COMPENSATION_UNITS = ['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'] as const
export type PublicCompensationUnit = (typeof PUBLIC_COMPENSATION_UNITS)[number]

/** Rango monetario aprobado y estructurado. Nunca derivado de public_compensation_band (texto libre). */
export interface PublicOpeningCompensationRange {
  /** ISO 4217, p. ej. `USD`, `CLP`. */
  currency: string
  minValue: number
  maxValue: number
  unitText: PublicCompensationUnit
}

/**
 * Contenido público estructurado de una vacante (v1). Todo campo es opcional u omitible:
 * su ausencia degrada al fallback legacy de prosa, nunca a huecos en el renderer.
 */
export interface PublicOpeningContent {
  version: typeof PUBLIC_OPENING_CONTENT_VERSION
  /** Promesa al candidato: qué gana la persona en este rol (1-2 frases). */
  promise: string | null
  /** Intro/misión: el problema concreto que la persona resolverá. */
  intro: string | null
  /** Resultados observables esperados del primer año. */
  outcomes: string[]
  /** Trabajo real / entregables del rol. */
  workItems: string[]
  /** Habilidades esenciales (must-have). */
  essentials: string[]
  /** Habilidades que se pueden aprender en el rol (learnable). */
  learnables: string[]
  /** Qué evidencia/portafolio se pide al candidato. */
  evidenceAsk: string | null
  /** Cómo opera el modelo remoto/híbrido en la práctica (husos, rituales, idioma). */
  remoteModel: string | null
  /** Etapas reales del proceso de selección, en orden. */
  processSteps: string[]
  /** Beneficios aprobados aplicables (no son compensación salarial). */
  benefits: string[]
  /** Rango de compensación aprobado y estructurado; null = no se publica salario. */
  compensation: PublicOpeningCompensationRange | null
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
  workMode: HiringPublicWorkMode | null
  hiringRegion: string | null
  city: string | null
  country: string | null
  officeLocation: string | null
  area: string | null
  skillTags: string[]
  compensationBand: string | null
  employmentMode: string | null
  seniority: string | null
  processNotes: string | null
  applyUrl: string | null
  publishedAt: string | null
  /** TASK-1740 — bloque estructurado candidate-facing; null = fallback legacy de prosa. */
  content: PublicOpeningContent | null
  /** TASK-1740 — países elegibles ISO alpha-2 para remoto; [] = sin elegibilidad declarada. */
  remoteEligibleCountries: string[]
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
  publicWorkMode?: HiringPublicWorkMode | null
  publicHiringRegion?: string | null
  publicCity?: string | null
  publicCountry?: string | null
  publicOfficeLocation?: string | null
  publicArea?: string | null
  publicSkillTags?: string[]
  publicCompensationBand?: string | null
  publicationSourceRef?: string | null
  publicEmploymentMode?: string | null
  publicSeniority?: string | null
  publicProcessNotes?: string | null
  /** TASK-1740 — bloque estructurado; el store re-valida con parsePublicOpeningContent. */
  publicContent?: PublicOpeningContent | Record<string, unknown> | null
  /** TASK-1740 — ISO alpha-2; el store valida contra isValidCountryCode. null limpia a []. */
  publicRemoteEligibleCountries?: string[] | null
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
  /** TASK-1688 — omitir/null preserva el valor existente (política anti-wipe del upsert). */
  phoneE164?: string | null
  residenceCountryCode?: string | null
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
  /** TASK-1688 — mensaje del candidato (application-scoped, ≤4000). */
  candidateMessage?: string | null
  dedupeFingerprint?: string | null
}

export interface DecideHiringApplicationInput {
  decision: HiringDecision
  reason: HiringDecisionReason
  idempotencyKey: string
  selectedDestination?: HiringFulfillmentMode | null
  tentativeStartDate?: string | null
  expectedLegalEntity?: string | null
  expectedContext?: string | null
  prerequisitesSnapshot?: Record<string, unknown>
}

export interface DecideHiringApplicationResult {
  application: HiringApplication
  decisionEntry: HiringDecisionHistoryEntry
  idempotentReplay: boolean
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
