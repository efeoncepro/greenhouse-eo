import 'server-only'

import type { PoolClient } from 'pg'

import {
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction,
} from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import {
  CANDIDATE_CONSENT_STATUSES,
  CANDIDATE_READINESS,
  CANDIDATE_SOURCES,
  HIRING_APPLICATION_STAGES,
  HIRING_FULFILLMENT_MODES,
  HIRING_OPENING_STATUSES,
  HIRING_OPENING_VISIBILITIES,
  HIRING_PUBLIC_WORK_MODES,
  TALENT_DEMAND_ENGAGEMENT_TYPES,
  TALENT_DEMAND_ORIGINS,
  TALENT_DEMAND_PRIORITIES,
  TALENT_DEMAND_STAKEHOLDER_TYPES,
  TALENT_DEMAND_STATUSES,
  type CandidateFacet,
  type CreateHiringApplicationInput,
  type CreateHiringOpeningInput,
  type CreateTalentDemandInput,
  type HiringApplication,
  type HiringOpening,
  type ListHiringApplicationFilters,
  type ListHiringOpeningFilters,
  type ListTalentDemandFilters,
  type ReconcileCandidateFacetInput,
  type TalentDemand,
  type TalentDemandStatus,
  type UpdateHiringOpeningInput,
  type UpdateTalentDemandInput,
} from '@/types/hiring'

import { HiringNotFoundError, HiringValidationError } from './errors'

// ── Query helper: dentro de transacción usa el PoolClient; standalone usa el pool ──

const runQuery = async <T extends Record<string, unknown>>(
  client: PoolClient | null,
  text: string,
  values: unknown[],
): Promise<T[]> => {
  if (client) {
    const result = await client.query(text, values)

    
return result.rows as T[]
  }

  
return runGreenhousePostgresQuery<T>(text, values)
}

// ── Coerción de filas crudas ──

const toStr = (value: unknown): string => (value == null ? '' : String(value))
const toNullableStr = (value: unknown): string | null => (value == null ? null : String(value))

const toNumber = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value)

  
return Number.isFinite(n) ? n : 0
}

const toNullableNumber = (value: unknown): number | null => {
  if (value == null) return null
  const n = typeof value === 'number' ? value : Number(value)

  
return Number.isFinite(n) ? n : null
}

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((v) => String(v))
  
return []
}

const toTimestamp = (value: unknown): string | null => {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()
  
return String(value)
}

const toDateString = (value: unknown): string | null => {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  
return String(value).slice(0, 10)
}

const toJsonObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>
    } catch {
      return {}
    }
  }

  
return {}
}

// ── Validadores de dominio ──

const assertNonEmptyString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HiringValidationError(`El campo ${field} es obligatorio.`, 'hiring_field_required', 400, { field })
  }

  
return value.trim()
}

const assertEnum = <T extends string>(value: unknown, allowed: readonly T[], field: string): T => {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new HiringValidationError(`El valor de ${field} no es válido.`, 'hiring_invalid_enum', 400, {
      field,
      allowed,
    })
  }

  
return value as T
}

const assertOptionalEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T | undefined => {
  if (value == null) return undefined
  
return assertEnum(value, allowed, field)
}

const assertPositiveSeats = (value: unknown, field: string): number => {
  const n = typeof value === 'number' ? value : Number(value)

  if (!Number.isInteger(n) || n < 1) {
    throw new HiringValidationError(`El campo ${field} debe ser un entero >= 1.`, 'hiring_invalid_seats', 400, { field })
  }

  
return n
}

const assertIdentityProfileExists = async (client: PoolClient | null, profileId: string): Promise<void> => {
  const rows = await runQuery<{ profile_id: string }>(
    client,
    `SELECT profile_id FROM greenhouse_core.identity_profiles WHERE profile_id = $1 LIMIT 1`,
    [profileId],
  )

  if (!rows[0]) {
    throw new HiringValidationError(
      'La persona (identity profile) referida no existe.',
      'hiring_identity_profile_not_found',
      400,
      { identityProfileId: profileId },
    )
  }
}

// ── Normalizadores (row snake_case → view model camelCase) ──

type TalentDemandRow = {
  demand_id: unknown
  public_id: unknown
  stakeholder_type: unknown
  engagement_type: unknown
  fulfillment_mode: unknown
  demand_origin: unknown
  organization_id: unknown
  client_id: unknown
  space_id: unknown
  business_unit: unknown
  service_id: unknown
  prospect_ref: unknown
  deal_ref: unknown
  external_account_ref: unknown
  requested_company_name: unknown
  requested_role: unknown
  requested_seats: unknown
  requested_skills: unknown
  target_start_date: unknown
  priority: unknown
  duration: unknown
  timezone: unknown
  language: unknown
  budget_band: unknown
  rate_band: unknown
  status: unknown
  owner_user_id: unknown
  notes: unknown
  created_by: unknown
  created_at: unknown
  updated_at: unknown
}

const normalizeTalentDemand = (row: TalentDemandRow): TalentDemand => ({
  demandId: toStr(row.demand_id),
  publicId: toStr(row.public_id),
  stakeholderType: toStr(row.stakeholder_type) as TalentDemand['stakeholderType'],
  engagementType: toStr(row.engagement_type) as TalentDemand['engagementType'],
  fulfillmentMode: toStr(row.fulfillment_mode) as TalentDemand['fulfillmentMode'],
  demandOrigin: toStr(row.demand_origin) as TalentDemand['demandOrigin'],
  organizationId: toNullableStr(row.organization_id),
  clientId: toNullableStr(row.client_id),
  spaceId: toNullableStr(row.space_id),
  businessUnit: toNullableStr(row.business_unit),
  serviceId: toNullableStr(row.service_id),
  prospectRef: toNullableStr(row.prospect_ref),
  dealRef: toNullableStr(row.deal_ref),
  externalAccountRef: toNullableStr(row.external_account_ref),
  requestedCompanyName: toNullableStr(row.requested_company_name),
  requestedRole: toStr(row.requested_role),
  requestedSeats: toNumber(row.requested_seats),
  requestedSkills: toStringArray(row.requested_skills),
  targetStartDate: toDateString(row.target_start_date),
  priority: toStr(row.priority) as TalentDemand['priority'],
  duration: toNullableStr(row.duration),
  timezone: toNullableStr(row.timezone),
  language: toNullableStr(row.language),
  budgetBand: toNullableStr(row.budget_band),
  rateBand: toNullableStr(row.rate_band),
  status: toStr(row.status) as TalentDemand['status'],
  ownerUserId: toNullableStr(row.owner_user_id),
  notes: toNullableStr(row.notes),
  createdBy: toNullableStr(row.created_by),
  createdAt: toTimestamp(row.created_at) ?? '',
  updatedAt: toTimestamp(row.updated_at) ?? '',
})

type HiringOpeningRow = {
  opening_id: unknown
  public_id: unknown
  demand_id: unknown
  internal_title: unknown
  seniority: unknown
  requested_seats: unknown
  owner_user_id: unknown
  space_id: unknown
  organization_id: unknown
  budget_band: unknown
  rate_band: unknown
  risk_notes: unknown
  internal_notes: unknown
  visibility: unknown
  publication_status: unknown
  public_title: unknown
  public_summary: unknown
  public_description: unknown
  public_requirements: unknown
  public_nice_to_have: unknown
  public_location_mode: unknown
  public_work_mode: unknown
  public_hiring_region: unknown
  public_city: unknown
  public_country: unknown
  public_office_location: unknown
  public_area: unknown
  public_skill_tags: unknown
  public_compensation_band: unknown
  publication_source_ref: unknown
  public_employment_mode: unknown
  public_seniority: unknown
  public_process_notes: unknown
  apply_url: unknown
  status: unknown
  published_at: unknown
  created_by: unknown
  created_at: unknown
  updated_at: unknown
}

const normalizeHiringOpening = (row: HiringOpeningRow): HiringOpening => ({
  openingId: toStr(row.opening_id),
  publicId: toStr(row.public_id),
  demandId: toStr(row.demand_id),
  internalTitle: toStr(row.internal_title),
  seniority: toNullableStr(row.seniority),
  requestedSeats: toNumber(row.requested_seats),
  ownerUserId: toNullableStr(row.owner_user_id),
  spaceId: toNullableStr(row.space_id),
  organizationId: toNullableStr(row.organization_id),
  budgetBand: toNullableStr(row.budget_band),
  rateBand: toNullableStr(row.rate_band),
  riskNotes: toNullableStr(row.risk_notes),
  internalNotes: toNullableStr(row.internal_notes),
  visibility: toStr(row.visibility) as HiringOpening['visibility'],
  publicationStatus: toStr(row.publication_status) as HiringOpening['publicationStatus'],
  publicTitle: toNullableStr(row.public_title),
  publicSummary: toNullableStr(row.public_summary),
  publicDescription: toNullableStr(row.public_description),
  publicRequirements: toNullableStr(row.public_requirements),
  publicNiceToHave: toNullableStr(row.public_nice_to_have),
  publicLocationMode: toNullableStr(row.public_location_mode),
  publicWorkMode: (toNullableStr(row.public_work_mode) as HiringOpening['publicWorkMode']) ?? null,
  publicHiringRegion: toNullableStr(row.public_hiring_region),
  publicCity: toNullableStr(row.public_city),
  publicCountry: toNullableStr(row.public_country),
  publicOfficeLocation: toNullableStr(row.public_office_location),
  publicArea: toNullableStr(row.public_area),
  publicSkillTags: toStringArray(row.public_skill_tags),
  publicCompensationBand: toNullableStr(row.public_compensation_band),
  publicationSourceRef: toNullableStr(row.publication_source_ref),
  publicEmploymentMode: toNullableStr(row.public_employment_mode),
  publicSeniority: toNullableStr(row.public_seniority),
  publicProcessNotes: toNullableStr(row.public_process_notes),
  applyUrl: toNullableStr(row.apply_url),
  status: toStr(row.status) as HiringOpening['status'],
  publishedAt: toTimestamp(row.published_at),
  createdBy: toNullableStr(row.created_by),
  createdAt: toTimestamp(row.created_at) ?? '',
  updatedAt: toTimestamp(row.updated_at) ?? '',
})

type CandidateFacetRow = {
  candidate_facet_id: unknown
  public_id: unknown
  identity_profile_id: unknown
  member_id: unknown
  source: unknown
  readiness: unknown
  availability: unknown
  seniority: unknown
  expected_rate: unknown
  expected_rate_currency: unknown
  rate_band: unknown
  consent_status: unknown
  consent_policy_version: unknown
  consent_captured_at: unknown
  retention_policy: unknown
  source_attribution: unknown
  verification_signals_json: unknown
  portfolio_url: unknown
  linkedin_url: unknown
  status: unknown
  notes: unknown
  created_by: unknown
  created_at: unknown
  updated_at: unknown
}

const normalizeCandidateFacet = (row: CandidateFacetRow): CandidateFacet => ({
  candidateFacetId: toStr(row.candidate_facet_id),
  publicId: toStr(row.public_id),
  identityProfileId: toStr(row.identity_profile_id),
  memberId: toNullableStr(row.member_id),
  source: toStr(row.source) as CandidateFacet['source'],
  readiness: toStr(row.readiness) as CandidateFacet['readiness'],
  availability: toNullableStr(row.availability),
  seniority: toNullableStr(row.seniority),
  expectedRate: toNullableNumber(row.expected_rate),
  expectedRateCurrency: toNullableStr(row.expected_rate_currency),
  rateBand: toNullableStr(row.rate_band),
  consentStatus: toStr(row.consent_status) as CandidateFacet['consentStatus'],
  consentPolicyVersion: toNullableStr(row.consent_policy_version),
  consentCapturedAt: toTimestamp(row.consent_captured_at),
  retentionPolicy: toNullableStr(row.retention_policy),
  sourceAttribution: toNullableStr(row.source_attribution),
  verificationSignals: toJsonObject(row.verification_signals_json),
  portfolioUrl: toNullableStr(row.portfolio_url),
  linkedinUrl: toNullableStr(row.linkedin_url),
  status: toStr(row.status) as CandidateFacet['status'],
  notes: toNullableStr(row.notes),
  createdBy: toNullableStr(row.created_by),
  createdAt: toTimestamp(row.created_at) ?? '',
  updatedAt: toTimestamp(row.updated_at) ?? '',
})

export type HiringApplicationRow = {
  application_id: unknown
  public_id: unknown
  opening_id: unknown
  identity_profile_id: unknown
  candidate_facet_id: unknown
  owner_user_id: unknown
  stage: unknown
  score: unknown
  match_score: unknown
  blocking_issues: unknown
  next_step_at: unknown
  source: unknown
  notes: unknown
  explainability_json: unknown
  dedupe_fingerprint: unknown
  decision: unknown
  decision_at: unknown
  decision_by: unknown
  selected_destination: unknown
  tentative_start_date: unknown
  expected_legal_entity: unknown
  expected_context: unknown
  prerequisites_snapshot_json: unknown
  created_by: unknown
  created_at: unknown
  updated_at: unknown
}

export const normalizeHiringApplication = (row: HiringApplicationRow): HiringApplication => ({
  applicationId: toStr(row.application_id),
  publicId: toStr(row.public_id),
  openingId: toStr(row.opening_id),
  identityProfileId: toStr(row.identity_profile_id),
  candidateFacetId: toStr(row.candidate_facet_id),
  ownerUserId: toNullableStr(row.owner_user_id),
  stage: toStr(row.stage) as HiringApplication['stage'],
  score: toNullableNumber(row.score),
  matchScore: toNullableNumber(row.match_score),
  blockingIssues: toStringArray(row.blocking_issues),
  nextStepAt: toTimestamp(row.next_step_at),
  source: toStr(row.source) as HiringApplication['source'],
  notes: toNullableStr(row.notes),
  explainability: toJsonObject(row.explainability_json),
  dedupeFingerprint: toNullableStr(row.dedupe_fingerprint),
  decision: (toNullableStr(row.decision) as HiringApplication['decision']) ?? null,
  decisionAt: toTimestamp(row.decision_at),
  decisionBy: toNullableStr(row.decision_by),
  selectedDestination: (toNullableStr(row.selected_destination) as HiringApplication['selectedDestination']) ?? null,
  tentativeStartDate: toDateString(row.tentative_start_date),
  expectedLegalEntity: toNullableStr(row.expected_legal_entity),
  expectedContext: toNullableStr(row.expected_context),
  prerequisitesSnapshot: toJsonObject(row.prerequisites_snapshot_json),
  createdBy: toNullableStr(row.created_by),
  createdAt: toTimestamp(row.created_at) ?? '',
  updatedAt: toTimestamp(row.updated_at) ?? '',
})

const TALENT_DEMAND_COLUMNS = `
  demand_id, public_id, stakeholder_type, engagement_type, fulfillment_mode, demand_origin,
  organization_id, client_id, space_id, business_unit, service_id, prospect_ref, deal_ref,
  external_account_ref, requested_company_name, requested_role, requested_seats, requested_skills,
  target_start_date, priority, duration, timezone, language, budget_band, rate_band, status,
  owner_user_id, notes, created_by, created_at, updated_at`

const HIRING_OPENING_COLUMNS = `
  opening_id, public_id, demand_id, internal_title, seniority, requested_seats, owner_user_id,
  space_id, organization_id, budget_band, rate_band, risk_notes, internal_notes, visibility,
  publication_status, public_title, public_summary, public_description, public_requirements,
  public_nice_to_have, public_location_mode, public_work_mode, public_hiring_region,
  public_city, public_country, public_office_location, public_area, public_skill_tags,
  public_compensation_band, publication_source_ref, public_employment_mode, public_seniority,
  public_process_notes, apply_url, status, published_at, created_by, created_at, updated_at`

const CANDIDATE_FACET_COLUMNS = `
  candidate_facet_id, public_id, identity_profile_id, member_id, source, readiness, availability,
  seniority, expected_rate, expected_rate_currency, rate_band, consent_status, consent_policy_version,
  consent_captured_at, retention_policy, source_attribution, verification_signals_json, portfolio_url,
  linkedin_url, status, notes, created_by, created_at, updated_at`

export const HIRING_APPLICATION_COLUMNS = `
  application_id, public_id, opening_id, identity_profile_id, candidate_facet_id, owner_user_id, stage,
  score, match_score, blocking_issues, next_step_at, source, notes, explainability_json,
  dedupe_fingerprint, decision, decision_at, decision_by, selected_destination, tentative_start_date,
  expected_legal_entity, expected_context, prerequisites_snapshot_json, created_by, created_at, updated_at`

// ══════════════════════════════════════════════════════════════════════════
// Readers — TalentDemand
// ══════════════════════════════════════════════════════════════════════════

export const getTalentDemandById = async (demandId: string): Promise<TalentDemand | null> => {
  const rows = await runGreenhousePostgresQuery<TalentDemandRow>(
    `SELECT ${TALENT_DEMAND_COLUMNS} FROM greenhouse_hiring.talent_demand WHERE demand_id = $1 LIMIT 1`,
    [demandId],
  )

  
return rows[0] ? normalizeTalentDemand(rows[0]) : null
}

export const listTalentDemands = async (filters: ListTalentDemandFilters = {}): Promise<TalentDemand[]> => {
  const clauses: string[] = []
  const values: unknown[] = []

  if (filters.status) {
    values.push(filters.status)
    clauses.push(`status = $${values.length}`)
  }

  if (filters.stakeholderType) {
    values.push(filters.stakeholderType)
    clauses.push(`stakeholder_type = $${values.length}`)
  }

  if (filters.organizationId) {
    values.push(filters.organizationId)
    clauses.push(`organization_id = $${values.length}`)
  }

  if (filters.spaceId) {
    values.push(filters.spaceId)
    clauses.push(`space_id = $${values.length}`)
  }

  if (filters.ownerUserId) {
    values.push(filters.ownerUserId)
    clauses.push(`owner_user_id = $${values.length}`)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  const offset = Math.max(filters.offset ?? 0, 0)

  values.push(limit, offset)

  const rows = await runGreenhousePostgresQuery<TalentDemandRow>(
    `SELECT ${TALENT_DEMAND_COLUMNS} FROM greenhouse_hiring.talent_demand
     ${where} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  )

  
return rows.map(normalizeTalentDemand)
}

// ══════════════════════════════════════════════════════════════════════════
// Readers — HiringOpening
// ══════════════════════════════════════════════════════════════════════════

export const getHiringOpeningById = async (openingId: string): Promise<HiringOpening | null> => {
  const rows = await runGreenhousePostgresQuery<HiringOpeningRow>(
    `SELECT ${HIRING_OPENING_COLUMNS} FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1 LIMIT 1`,
    [openingId],
  )

  
return rows[0] ? normalizeHiringOpening(rows[0]) : null
}

export const listHiringOpenings = async (filters: ListHiringOpeningFilters = {}): Promise<HiringOpening[]> => {
  const clauses: string[] = []
  const values: unknown[] = []

  if (filters.demandId) {
    values.push(filters.demandId)
    clauses.push(`demand_id = $${values.length}`)
  }

  if (filters.status) {
    values.push(filters.status)
    clauses.push(`status = $${values.length}`)
  }

  if (filters.publicationStatus) {
    values.push(filters.publicationStatus)
    clauses.push(`publication_status = $${values.length}`)
  }

  if (filters.visibility) {
    values.push(filters.visibility)
    clauses.push(`visibility = $${values.length}`)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  const offset = Math.max(filters.offset ?? 0, 0)

  values.push(limit, offset)

  const rows = await runGreenhousePostgresQuery<HiringOpeningRow>(
    `SELECT ${HIRING_OPENING_COLUMNS} FROM greenhouse_hiring.hiring_opening
     ${where} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  )

  
return rows.map(normalizeHiringOpening)
}

// ══════════════════════════════════════════════════════════════════════════
// Readers — CandidateFacet
// ══════════════════════════════════════════════════════════════════════════

export const getCandidateFacetById = async (candidateFacetId: string): Promise<CandidateFacet | null> => {
  const rows = await runGreenhousePostgresQuery<CandidateFacetRow>(
    `SELECT ${CANDIDATE_FACET_COLUMNS} FROM greenhouse_hiring.candidate_facet WHERE candidate_facet_id = $1 LIMIT 1`,
    [candidateFacetId],
  )

  
return rows[0] ? normalizeCandidateFacet(rows[0]) : null
}

export const getCandidateFacetByProfile = async (identityProfileId: string): Promise<CandidateFacet | null> => {
  const rows = await runGreenhousePostgresQuery<CandidateFacetRow>(
    `SELECT ${CANDIDATE_FACET_COLUMNS} FROM greenhouse_hiring.candidate_facet WHERE identity_profile_id = $1 LIMIT 1`,
    [identityProfileId],
  )

  
return rows[0] ? normalizeCandidateFacet(rows[0]) : null
}

// ══════════════════════════════════════════════════════════════════════════
// Readers — HiringApplication
// ══════════════════════════════════════════════════════════════════════════

export const getHiringApplicationById = async (applicationId: string): Promise<HiringApplication | null> => {
  const rows = await runGreenhousePostgresQuery<HiringApplicationRow>(
    `SELECT ${HIRING_APPLICATION_COLUMNS} FROM greenhouse_hiring.hiring_application WHERE application_id = $1 LIMIT 1`,
    [applicationId],
  )

  
return rows[0] ? normalizeHiringApplication(rows[0]) : null
}

export const listHiringApplications = async (
  filters: ListHiringApplicationFilters = {},
): Promise<HiringApplication[]> => {
  const clauses: string[] = []
  const values: unknown[] = []

  if (filters.openingId) {
    values.push(filters.openingId)
    clauses.push(`opening_id = $${values.length}`)
  }

  if (filters.identityProfileId) {
    values.push(filters.identityProfileId)
    clauses.push(`identity_profile_id = $${values.length}`)
  }

  if (filters.stage) {
    values.push(filters.stage)
    clauses.push(`stage = $${values.length}`)
  }

  if (filters.source) {
    values.push(filters.source)
    clauses.push(`source = $${values.length}`)
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200)
  const offset = Math.max(filters.offset ?? 0, 0)

  values.push(limit, offset)

  const rows = await runGreenhousePostgresQuery<HiringApplicationRow>(
    `SELECT ${HIRING_APPLICATION_COLUMNS} FROM greenhouse_hiring.hiring_application
     ${where} ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  )

  
return rows.map(normalizeHiringApplication)
}

// ══════════════════════════════════════════════════════════════════════════
// Writers — TalentDemand
// ══════════════════════════════════════════════════════════════════════════

export const createTalentDemand = async (
  input: CreateTalentDemandInput,
  actorUserId: string | null,
): Promise<TalentDemand> => {
  const stakeholderType = assertEnum(input.stakeholderType, TALENT_DEMAND_STAKEHOLDER_TYPES, 'stakeholderType')
  const engagementType = assertEnum(input.engagementType, TALENT_DEMAND_ENGAGEMENT_TYPES, 'engagementType')
  const fulfillmentMode = assertEnum(input.fulfillmentMode, HIRING_FULFILLMENT_MODES, 'fulfillmentMode')
  const demandOrigin = assertEnum(input.demandOrigin, TALENT_DEMAND_ORIGINS, 'demandOrigin')
  const requestedRole = assertNonEmptyString(input.requestedRole, 'requestedRole')
  const requestedSeats = input.requestedSeats == null ? 1 : assertPositiveSeats(input.requestedSeats, 'requestedSeats')
  const priority = assertOptionalEnum(input.priority, TALENT_DEMAND_PRIORITIES, 'priority') ?? 'medium'

  return withGreenhousePostgresTransaction(async (client) => {
    const rows = await runQuery<TalentDemandRow>(
      client,
      `INSERT INTO greenhouse_hiring.talent_demand (
         stakeholder_type, engagement_type, fulfillment_mode, demand_origin, organization_id, client_id,
         space_id, business_unit, service_id, prospect_ref, deal_ref, external_account_ref,
         requested_company_name, requested_role, requested_seats, requested_skills, target_start_date,
         priority, duration, timezone, language, budget_band, rate_band, owner_user_id, notes, created_by
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
         $22, $23, $24, $25, $26
       )
       RETURNING ${TALENT_DEMAND_COLUMNS}`,
      [
        stakeholderType,
        engagementType,
        fulfillmentMode,
        demandOrigin,
        input.organizationId ?? null,
        input.clientId ?? null,
        input.spaceId ?? null,
        input.businessUnit ?? null,
        input.serviceId ?? null,
        input.prospectRef ?? null,
        input.dealRef ?? null,
        input.externalAccountRef ?? null,
        input.requestedCompanyName ?? null,
        requestedRole,
        requestedSeats,
        input.requestedSkills ?? [],
        input.targetStartDate ?? null,
        priority,
        input.duration ?? null,
        input.timezone ?? null,
        input.language ?? null,
        input.budgetBand ?? null,
        input.rateBand ?? null,
        input.ownerUserId ?? null,
        input.notes ?? null,
        actorUserId,
      ],
    )

    const demand = normalizeTalentDemand(rows[0])

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.talentDemand,
        aggregateId: demand.demandId,
        eventType: EVENT_TYPES.talentDemandCreated,
        payload: { demandId: demand.demandId, publicId: demand.publicId, status: demand.status },
      },
      client,
    )
    
return demand
  })
}

export const updateTalentDemand = async (
  demandId: string,
  input: UpdateTalentDemandInput,
  actorUserId: string | null,
): Promise<TalentDemand> => {
  const sets: string[] = []
  const values: unknown[] = []

  const push = (column: string, value: unknown) => {
    values.push(value)
    sets.push(`${column} = $${values.length}`)
  }

  let statusChanged: TalentDemandStatus | undefined

  if (input.status !== undefined) {
    statusChanged = assertEnum(input.status, TALENT_DEMAND_STATUSES, 'status')
    push('status', statusChanged)
  }

  if (input.requestedRole !== undefined) push('requested_role', assertNonEmptyString(input.requestedRole, 'requestedRole'))
  if (input.requestedSeats !== undefined) push('requested_seats', assertPositiveSeats(input.requestedSeats, 'requestedSeats'))
  if (input.requestedSkills !== undefined) push('requested_skills', input.requestedSkills)
  if (input.priority !== undefined) push('priority', assertEnum(input.priority, TALENT_DEMAND_PRIORITIES, 'priority'))
  if (input.targetStartDate !== undefined) push('target_start_date', input.targetStartDate)
  if (input.duration !== undefined) push('duration', input.duration)
  if (input.timezone !== undefined) push('timezone', input.timezone)
  if (input.language !== undefined) push('language', input.language)
  if (input.budgetBand !== undefined) push('budget_band', input.budgetBand)
  if (input.rateBand !== undefined) push('rate_band', input.rateBand)
  if (input.ownerUserId !== undefined) push('owner_user_id', input.ownerUserId)
  if (input.notes !== undefined) push('notes', input.notes)

  if (sets.length === 0) {
    const existing = await getTalentDemandById(demandId)

    if (!existing) throw new HiringNotFoundError('La demanda de talento no existe.', 'talent_demand_not_found')
    
return existing
  }

  values.push(demandId)
  
return withGreenhousePostgresTransaction(async (client) => {
    const rows = await runQuery<TalentDemandRow>(
      client,
      `UPDATE greenhouse_hiring.talent_demand SET ${sets.join(', ')}
       WHERE demand_id = $${values.length} RETURNING ${TALENT_DEMAND_COLUMNS}`,
      values,
    )

    if (!rows[0]) throw new HiringNotFoundError('La demanda de talento no existe.', 'talent_demand_not_found')
    const demand = normalizeTalentDemand(rows[0])

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.talentDemand,
        aggregateId: demand.demandId,
        eventType: statusChanged ? EVENT_TYPES.talentDemandStatusChanged : EVENT_TYPES.talentDemandUpdated,
        payload: { demandId: demand.demandId, status: demand.status, actorUserId },
      },
      client,
    )
    
return demand
  })
}

// ══════════════════════════════════════════════════════════════════════════
// Writers — HiringOpening
// ══════════════════════════════════════════════════════════════════════════

export const createHiringOpening = async (
  input: CreateHiringOpeningInput,
  actorUserId: string | null,
): Promise<HiringOpening> => {
  const demandId = assertNonEmptyString(input.demandId, 'demandId')
  const internalTitle = assertNonEmptyString(input.internalTitle, 'internalTitle')
  const requestedSeats = input.requestedSeats == null ? 1 : assertPositiveSeats(input.requestedSeats, 'requestedSeats')

  return withGreenhousePostgresTransaction(async (client) => {
    const demandRows = await runQuery<{ demand_id: string }>(
      client,
      `SELECT demand_id FROM greenhouse_hiring.talent_demand WHERE demand_id = $1 LIMIT 1`,
      [demandId],
    )

    if (!demandRows[0]) {
      throw new HiringValidationError('La demanda de talento referida no existe.', 'talent_demand_not_found', 400, {
        demandId,
      })
    }

    const rows = await runQuery<HiringOpeningRow>(
      client,
      `INSERT INTO greenhouse_hiring.hiring_opening (
         demand_id, internal_title, seniority, requested_seats, owner_user_id, space_id, organization_id,
         budget_band, rate_band, risk_notes, internal_notes, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING ${HIRING_OPENING_COLUMNS}`,
      [
        demandId,
        internalTitle,
        input.seniority ?? null,
        requestedSeats,
        input.ownerUserId ?? null,
        input.spaceId ?? null,
        input.organizationId ?? null,
        input.budgetBand ?? null,
        input.rateBand ?? null,
        input.riskNotes ?? null,
        input.internalNotes ?? null,
        actorUserId,
      ],
    )

    const opening = normalizeHiringOpening(rows[0])

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringOpening,
        aggregateId: opening.openingId,
        eventType: EVENT_TYPES.hiringOpeningCreated,
        payload: { openingId: opening.openingId, demandId: opening.demandId, publicId: opening.publicId },
      },
      client,
    )
    
return opening
  })
}

export const updateHiringOpening = async (
  openingId: string,
  input: UpdateHiringOpeningInput,
  actorUserId: string | null,
): Promise<HiringOpening> => {
  const sets: string[] = []
  const values: unknown[] = []

  const push = (column: string, value: unknown) => {
    values.push(value)
    sets.push(`${column} = $${values.length}`)
  }

  let statusChanged = false

  if (input.internalTitle !== undefined) push('internal_title', assertNonEmptyString(input.internalTitle, 'internalTitle'))
  if (input.seniority !== undefined) push('seniority', input.seniority)
  if (input.requestedSeats !== undefined) push('requested_seats', assertPositiveSeats(input.requestedSeats, 'requestedSeats'))
  if (input.ownerUserId !== undefined) push('owner_user_id', input.ownerUserId)
  if (input.budgetBand !== undefined) push('budget_band', input.budgetBand)
  if (input.rateBand !== undefined) push('rate_band', input.rateBand)
  if (input.riskNotes !== undefined) push('risk_notes', input.riskNotes)
  if (input.internalNotes !== undefined) push('internal_notes', input.internalNotes)

  if (input.status !== undefined) {
    push('status', assertEnum(input.status, HIRING_OPENING_STATUSES, 'status'))
    statusChanged = true
  }

  if (input.visibility !== undefined) push('visibility', assertEnum(input.visibility, HIRING_OPENING_VISIBILITIES, 'visibility'))
  if (input.publicTitle !== undefined) push('public_title', input.publicTitle)
  if (input.publicSummary !== undefined) push('public_summary', input.publicSummary)
  if (input.publicDescription !== undefined) push('public_description', input.publicDescription)
  if (input.publicRequirements !== undefined) push('public_requirements', input.publicRequirements)
  if (input.publicNiceToHave !== undefined) push('public_nice_to_have', input.publicNiceToHave)
  if (input.publicLocationMode !== undefined) push('public_location_mode', input.publicLocationMode)

  if (input.publicWorkMode !== undefined) {
    push('public_work_mode', input.publicWorkMode == null ? null : assertEnum(input.publicWorkMode, HIRING_PUBLIC_WORK_MODES, 'publicWorkMode'))
  }

  if (input.publicHiringRegion !== undefined) push('public_hiring_region', input.publicHiringRegion)
  if (input.publicCity !== undefined) push('public_city', input.publicCity)
  if (input.publicCountry !== undefined) push('public_country', input.publicCountry)
  if (input.publicOfficeLocation !== undefined) push('public_office_location', input.publicOfficeLocation)
  if (input.publicArea !== undefined) push('public_area', input.publicArea)
  if (input.publicSkillTags !== undefined) push('public_skill_tags', input.publicSkillTags)
  if (input.publicCompensationBand !== undefined) push('public_compensation_band', input.publicCompensationBand)
  if (input.publicationSourceRef !== undefined) push('publication_source_ref', input.publicationSourceRef)
  if (input.publicEmploymentMode !== undefined) push('public_employment_mode', input.publicEmploymentMode)
  if (input.publicSeniority !== undefined) push('public_seniority', input.publicSeniority)
  if (input.publicProcessNotes !== undefined) push('public_process_notes', input.publicProcessNotes)
  if (input.applyUrl !== undefined) push('apply_url', input.applyUrl)

  if (sets.length === 0) {
    const existing = await getHiringOpeningById(openingId)

    if (!existing) throw new HiringNotFoundError('El opening no existe.', 'hiring_opening_not_found')
    
return existing
  }

  values.push(openingId)
  
return withGreenhousePostgresTransaction(async (client) => {
    const rows = await runQuery<HiringOpeningRow>(
      client,
      `UPDATE greenhouse_hiring.hiring_opening SET ${sets.join(', ')}
       WHERE opening_id = $${values.length} RETURNING ${HIRING_OPENING_COLUMNS}`,
      values,
    )

    if (!rows[0]) throw new HiringNotFoundError('El opening no existe.', 'hiring_opening_not_found')
    const opening = normalizeHiringOpening(rows[0])

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringOpening,
        aggregateId: opening.openingId,
        eventType: statusChanged ? EVENT_TYPES.hiringOpeningStatusChanged : EVENT_TYPES.hiringOpeningUpdated,
        payload: { openingId: opening.openingId, status: opening.status, actorUserId },
      },
      client,
    )
    
return opening
  })
}

// ══════════════════════════════════════════════════════════════════════════
// Writers — CandidateFacet (reconciliación Person-first, upsert por identity_profile_id)
// ══════════════════════════════════════════════════════════════════════════

export const reconcileCandidateFacet = async (
  input: ReconcileCandidateFacetInput,
  actorUserId: string | null,
): Promise<CandidateFacet> => {
  const identityProfileId = assertNonEmptyString(input.identityProfileId, 'identityProfileId')
  const source = assertOptionalEnum(input.source, CANDIDATE_SOURCES, 'source') ?? 'manual'
  const readiness = assertOptionalEnum(input.readiness, CANDIDATE_READINESS, 'readiness') ?? 'unknown'
  const consentStatus = assertOptionalEnum(input.consentStatus, CANDIDATE_CONSENT_STATUSES, 'consentStatus') ?? 'not_captured'

  return withGreenhousePostgresTransaction(async (client) => {
    await assertIdentityProfileExists(client, identityProfileId)

    const existingRows = await runQuery<{ candidate_facet_id: string }>(
      client,
      `SELECT candidate_facet_id FROM greenhouse_hiring.candidate_facet WHERE identity_profile_id = $1 LIMIT 1`,
      [identityProfileId],
    )

    const isNew = !existingRows[0]

    // Upsert por identity_profile_id (UNIQUE): una Person tiene a lo más una candidate_facet.
    const rows = await runQuery<CandidateFacetRow>(
      client,
      `INSERT INTO greenhouse_hiring.candidate_facet (
         identity_profile_id, member_id, source, readiness, availability, seniority, expected_rate,
         expected_rate_currency, rate_band, consent_status, consent_policy_version, consent_captured_at,
         retention_policy, source_attribution, portfolio_url, linkedin_url, notes, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (identity_profile_id) DO UPDATE SET
         member_id = COALESCE(EXCLUDED.member_id, greenhouse_hiring.candidate_facet.member_id),
         source = EXCLUDED.source,
         readiness = EXCLUDED.readiness,
         availability = COALESCE(EXCLUDED.availability, greenhouse_hiring.candidate_facet.availability),
         seniority = COALESCE(EXCLUDED.seniority, greenhouse_hiring.candidate_facet.seniority),
         expected_rate = COALESCE(EXCLUDED.expected_rate, greenhouse_hiring.candidate_facet.expected_rate),
         expected_rate_currency = COALESCE(EXCLUDED.expected_rate_currency, greenhouse_hiring.candidate_facet.expected_rate_currency),
         rate_band = COALESCE(EXCLUDED.rate_band, greenhouse_hiring.candidate_facet.rate_band),
         consent_status = EXCLUDED.consent_status,
         consent_policy_version = COALESCE(EXCLUDED.consent_policy_version, greenhouse_hiring.candidate_facet.consent_policy_version),
         consent_captured_at = COALESCE(EXCLUDED.consent_captured_at, greenhouse_hiring.candidate_facet.consent_captured_at),
         retention_policy = COALESCE(EXCLUDED.retention_policy, greenhouse_hiring.candidate_facet.retention_policy),
         source_attribution = COALESCE(EXCLUDED.source_attribution, greenhouse_hiring.candidate_facet.source_attribution),
         portfolio_url = COALESCE(EXCLUDED.portfolio_url, greenhouse_hiring.candidate_facet.portfolio_url),
         linkedin_url = COALESCE(EXCLUDED.linkedin_url, greenhouse_hiring.candidate_facet.linkedin_url),
         notes = COALESCE(EXCLUDED.notes, greenhouse_hiring.candidate_facet.notes)
       RETURNING ${CANDIDATE_FACET_COLUMNS}`,
      [
        identityProfileId,
        input.memberId ?? null,
        source,
        readiness,
        input.availability ?? null,
        input.seniority ?? null,
        input.expectedRate ?? null,
        input.expectedRateCurrency ?? null,
        input.rateBand ?? null,
        consentStatus,
        input.consentPolicyVersion ?? null,
        input.consentCapturedAt ?? null,
        input.retentionPolicy ?? null,
        input.sourceAttribution ?? null,
        input.portfolioUrl ?? null,
        input.linkedinUrl ?? null,
        input.notes ?? null,
        actorUserId,
      ],
    )

    const facet = normalizeCandidateFacet(rows[0])

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringCandidateFacet,
        aggregateId: facet.candidateFacetId,
        eventType: isNew ? EVENT_TYPES.hiringCandidateFacetCreated : EVENT_TYPES.hiringCandidateFacetUpdated,
        payload: { candidateFacetId: facet.candidateFacetId, identityProfileId: facet.identityProfileId, source: facet.source },
      },
      client,
    )
    
return facet
  })
}

// ══════════════════════════════════════════════════════════════════════════
// Writers — HiringApplication (unidad del pipeline)
// ══════════════════════════════════════════════════════════════════════════

export const createHiringApplication = async (
  input: CreateHiringApplicationInput,
  actorUserId: string | null,
): Promise<HiringApplication> => {
  const openingId = assertNonEmptyString(input.openingId, 'openingId')
  const identityProfileId = assertNonEmptyString(input.identityProfileId, 'identityProfileId')
  const candidateFacetId = assertNonEmptyString(input.candidateFacetId, 'candidateFacetId')
  const stage = assertOptionalEnum(input.stage, HIRING_APPLICATION_STAGES, 'stage') ?? 'sourced'
  const source = assertOptionalEnum(input.source, CANDIDATE_SOURCES, 'source') ?? 'manual'

  return withGreenhousePostgresTransaction(async (client) => {
    const openingRows = await runQuery<{ opening_id: string }>(
      client,
      `SELECT opening_id FROM greenhouse_hiring.hiring_opening WHERE opening_id = $1 LIMIT 1`,
      [openingId],
    )

    if (!openingRows[0]) {
      throw new HiringValidationError('El opening referido no existe.', 'hiring_opening_not_found', 400, { openingId })
    }

    const facetRows = await runQuery<{ identity_profile_id: string }>(
      client,
      `SELECT identity_profile_id FROM greenhouse_hiring.candidate_facet WHERE candidate_facet_id = $1 LIMIT 1`,
      [candidateFacetId],
    )

    if (!facetRows[0]) {
      throw new HiringValidationError('La candidate facet referida no existe.', 'candidate_facet_not_found', 400, {
        candidateFacetId,
      })
    }

    if (facetRows[0].identity_profile_id !== identityProfileId) {
      throw new HiringValidationError(
        'La candidate facet no corresponde a la persona indicada.',
        'candidate_facet_profile_mismatch',
        400,
      )
    }

    const existing = await runQuery<{ application_id: string }>(
      client,
      `SELECT application_id FROM greenhouse_hiring.hiring_application
       WHERE opening_id = $1 AND identity_profile_id = $2 LIMIT 1`,
      [openingId, identityProfileId],
    )

    if (existing[0]) {
      throw new HiringValidationError(
        'Ya existe una postulación de esta persona para este opening.',
        'hiring_application_duplicate',
        409,
        { applicationId: existing[0].application_id },
      )
    }

    const rows = await runQuery<HiringApplicationRow>(
      client,
      `INSERT INTO greenhouse_hiring.hiring_application (
         opening_id, identity_profile_id, candidate_facet_id, owner_user_id, stage, score, match_score,
         blocking_issues, next_step_at, source, notes, dedupe_fingerprint, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING ${HIRING_APPLICATION_COLUMNS}`,
      [
        openingId,
        identityProfileId,
        candidateFacetId,
        input.ownerUserId ?? null,
        stage,
        input.score ?? null,
        input.matchScore ?? null,
        input.blockingIssues ?? [],
        input.nextStepAt ?? null,
        source,
        input.notes ?? null,
        input.dedupeFingerprint ?? null,
        actorUserId,
      ],
    )

    const application = normalizeHiringApplication(rows[0])

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringApplication,
        aggregateId: application.applicationId,
        eventType: EVENT_TYPES.hiringApplicationCreated,
        payload: {
          applicationId: application.applicationId,
          openingId: application.openingId,
          identityProfileId: application.identityProfileId,
          stage: application.stage,
        },
      },
      client,
    )
    
return application
  })
}

export const updateHiringApplicationStage = async (
  applicationId: string,
  stage: HiringApplication['stage'],
  actorUserId: string | null,
): Promise<HiringApplication> => {
  const nextStage = assertEnum(stage, HIRING_APPLICATION_STAGES, 'stage')

  
return withGreenhousePostgresTransaction(async (client) => {
    const rows = await runQuery<HiringApplicationRow>(
      client,
      `UPDATE greenhouse_hiring.hiring_application SET stage = $1
       WHERE application_id = $2 RETURNING ${HIRING_APPLICATION_COLUMNS}`,
      [nextStage, applicationId],
    )

    if (!rows[0]) throw new HiringNotFoundError('La postulación no existe.', 'hiring_application_not_found')
    const application = normalizeHiringApplication(rows[0])

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringApplication,
        aggregateId: application.applicationId,
        eventType: EVENT_TYPES.hiringApplicationStageChanged,
        payload: { applicationId: application.applicationId, stage: application.stage, actorUserId },
      },
      client,
    )
    
return application
  })
}
