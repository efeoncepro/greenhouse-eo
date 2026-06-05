import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { getJurisdictionPack } from './jurisdiction-packs/registry'
import { buildCaseProjection, type ContractingCaseProjection } from './projection'
import { CASE_COLUMNS, mapCaseRow } from './store'
import {
  type WorkforceContractingCase,
  type WorkforceContractingCaseEvent,
  type WorkforceContractingCaseKind,
  type WorkforceContractingCaseStatus,
  type WorkforceContractingDraftStatus,
  type WorkforceContractingStructuredContent,
  type WorkforceContractingValidationResult
} from './types'

// Row shape returned by the case queries (case columns + joined extras).
type CaseRowWithExtras = Record<string, unknown> & {
  subject_name: string | null
  latest_validation: WorkforceContractingValidationResult | null
  latest_draft_version: number | null
}

const projectCase = (
  contractingCase: WorkforceContractingCase,
  latestValidation: WorkforceContractingValidationResult | null
): ContractingCaseProjection => {
  const pack = getJurisdictionPack(contractingCase.jurisdictionPackCode)

  return buildCaseProjection({
    caseKind: contractingCase.caseKind,
    status: contractingCase.status,
    authoritativeLanguage: contractingCase.authoritativeLanguage,
    blockerCount: latestValidation?.blockers?.length ?? 0,
    languageParityStatus: latestValidation?.languageParity?.status ?? 'unknown',
    requiresLegalReview: pack?.requiresLegalReviewReference ?? false,
    hasLegalReviewReference: Boolean(contractingCase.legalReviewReference)
  })
}

const LATEST_DRAFT_LATERAL = `
  LEFT JOIN LATERAL (
    SELECT validation_snapshot_json, draft_version
    FROM greenhouse_hr.workforce_contracting_drafts d
    WHERE d.case_id = c.case_id
    ORDER BY d.draft_version DESC
    LIMIT 1
  ) ld ON TRUE
`

export interface ContractingCaseListItem {
  caseId: string
  caseKind: WorkforceContractingCaseKind
  status: WorkforceContractingCaseStatus
  subjectIdentityProfileId: string
  subjectName: string | null
  jurisdictionPackCode: string
  authoritativeLanguage: 'es-CL' | 'en-US'
  signableFormat: 'pdf' | 'docx'
  targetStartDate: string | null
  latestDraftVersion: number | null
  projection: ContractingCaseProjection
  createdAt: string
  updatedAt: string
}

export interface ListContractingCasesInput {
  caseKind?: WorkforceContractingCaseKind
  status?: WorkforceContractingCaseStatus
  limit?: number
  offset?: number
}

export interface ListContractingCasesResult {
  items: ContractingCaseListItem[]
  total: number
}

/** Admin queue reader (Command Center). Product-shaped projection per case. */
export const listContractingCases = async (
  input: ListContractingCasesInput = {}
): Promise<ListContractingCasesResult> => {
  const conditions: string[] = []
  const params: unknown[] = []

  if (input.caseKind) {
    params.push(input.caseKind)
    conditions.push(`c.case_kind = $${params.length}`)
  }

  if (input.status) {
    params.push(input.status)
    conditions.push(`c.status = $${params.length}`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200)
  const offset = Math.max(input.offset ?? 0, 0)

  const rows = await runGreenhousePostgresQuery<CaseRowWithExtras>(
    `SELECT ${CASE_COLUMNS.split(',').map(col => `c.${col.trim()}`).join(', ')},
            ip.full_name AS subject_name,
            ld.validation_snapshot_json AS latest_validation,
            ld.draft_version AS latest_draft_version
     FROM greenhouse_hr.workforce_contracting_cases c
     LEFT JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = c.subject_identity_profile_id
     ${LATEST_DRAFT_LATERAL}
     ${where}
     ORDER BY c.updated_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  )

  const totalRows = await runGreenhousePostgresQuery<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM greenhouse_hr.workforce_contracting_cases c ${where}`,
    params
  )

  const items = rows.map(row => {
    const contractingCase = mapCaseRow(row as never)

    return {
      caseId: contractingCase.caseId,
      caseKind: contractingCase.caseKind,
      status: contractingCase.status,
      subjectIdentityProfileId: contractingCase.subjectIdentityProfileId,
      subjectName: row.subject_name,
      jurisdictionPackCode: contractingCase.jurisdictionPackCode,
      authoritativeLanguage: contractingCase.authoritativeLanguage,
      signableFormat: contractingCase.signableFormat,
      targetStartDate: contractingCase.targetStartDate,
      latestDraftVersion: row.latest_draft_version != null ? Number(row.latest_draft_version) : null,
      projection: projectCase(contractingCase, row.latest_validation),
      createdAt: contractingCase.createdAt,
      updatedAt: contractingCase.updatedAt
    }
  })

  return { items, total: Number(totalRows[0]?.total ?? 0) }
}

export interface ContractingDraftSummary {
  draftId: string
  draftVersion: number
  source: string
  status: WorkforceContractingDraftStatus
  languageParityStatus: string | null
  blockerCount: number
  createdAt: string
}

export interface ContractingCaseDetail {
  case: WorkforceContractingCase
  subjectName: string | null
  projection: ContractingCaseProjection
  latestValidation: WorkforceContractingValidationResult | null
  drafts: ContractingDraftSummary[]
  timeline: WorkforceContractingCaseEvent[]
}

/** Case detail reader (Case Detail + Bilingual Review Desk + timeline). */
export const getContractingCaseDetail = async (caseId: string): Promise<ContractingCaseDetail | null> => {
  const rows = await runGreenhousePostgresQuery<CaseRowWithExtras>(
    `SELECT ${CASE_COLUMNS.split(',').map(col => `c.${col.trim()}`).join(', ')},
            ip.full_name AS subject_name,
            ld.validation_snapshot_json AS latest_validation,
            ld.draft_version AS latest_draft_version
     FROM greenhouse_hr.workforce_contracting_cases c
     LEFT JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = c.subject_identity_profile_id
     ${LATEST_DRAFT_LATERAL}
     WHERE c.case_id = $1`,
    [caseId]
  )

  if (!rows[0]) return null

  const contractingCase = mapCaseRow(rows[0] as never)
  const latestValidation = rows[0].latest_validation

  const draftRows = await runGreenhousePostgresQuery<{
    draft_id: string
    draft_version: number
    source: string
    status: WorkforceContractingDraftStatus
    validation_snapshot_json: WorkforceContractingValidationResult | null
    created_at: unknown
  }>(
    `SELECT draft_id, draft_version, source, status, validation_snapshot_json, created_at
     FROM greenhouse_hr.workforce_contracting_drafts
     WHERE case_id = $1 ORDER BY draft_version DESC`,
    [caseId]
  )

  const eventRows = await runGreenhousePostgresQuery<{
    event_id: string
    case_id: string
    event_kind: string
    from_status: string | null
    to_status: string | null
    payload_json: Record<string, unknown> | null
    actor_user_id: string | null
    occurred_at: unknown
  }>(
    `SELECT event_id, case_id, event_kind, from_status, to_status, payload_json, actor_user_id, occurred_at
     FROM greenhouse_hr.workforce_contracting_case_events
     WHERE case_id = $1 ORDER BY occurred_at DESC LIMIT 100`,
    [caseId]
  )

  return {
    case: contractingCase,
    subjectName: rows[0].subject_name,
    projection: projectCase(contractingCase, latestValidation),
    latestValidation,
    drafts: draftRows.map(d => ({
      draftId: d.draft_id,
      draftVersion: Number(d.draft_version),
      source: d.source,
      status: d.status,
      languageParityStatus: d.validation_snapshot_json?.languageParity?.status ?? null,
      blockerCount: d.validation_snapshot_json?.blockers?.length ?? 0,
      createdAt: d.created_at instanceof Date ? d.created_at.toISOString() : String(d.created_at)
    })),
    timeline: eventRows.map(e => ({
      eventId: e.event_id,
      caseId: e.case_id,
      eventKind: e.event_kind,
      fromStatus: e.from_status,
      toStatus: e.to_status,
      payloadJson: e.payload_json ?? {},
      actorUserId: e.actor_user_id,
      occurredAt: e.occurred_at instanceof Date ? e.occurred_at.toISOString() : String(e.occurred_at)
    }))
  }
}

export interface ContractingDraftContent {
  draftId: string
  draftVersion: number
  status: WorkforceContractingDraftStatus
  source: string
  structuredContent: WorkforceContractingStructuredContent | null
  validation: WorkforceContractingValidationResult | null
}

/**
 * Latest draft body for the Bilingual Review Desk (TASK-1021 Slice 3). Returns the
 * full structured bilingual content (es-CL + en-US sections) + the validation snapshot.
 * Null when the case has no draft yet (honest empty state).
 */
export const getLatestContractingDraftContent = async (caseId: string): Promise<ContractingDraftContent | null> => {
  const rows = await runGreenhousePostgresQuery<{
    draft_id: string
    draft_version: number
    status: WorkforceContractingDraftStatus
    source: string
    structured_content_json: WorkforceContractingStructuredContent | Record<string, unknown> | null
    validation_snapshot_json: WorkforceContractingValidationResult | null
  }>(
    `SELECT draft_id, draft_version, status, source, structured_content_json, validation_snapshot_json
     FROM greenhouse_hr.workforce_contracting_drafts
     WHERE case_id = $1
     ORDER BY draft_version DESC
     LIMIT 1`,
    [caseId]
  )

  if (!rows[0]) return null

  const raw = rows[0].structured_content_json

  const structuredContent =
    raw && typeof raw === 'object' && 'localizedDrafts' in raw
      ? (raw as WorkforceContractingStructuredContent)
      : null

  return {
    draftId: rows[0].draft_id,
    draftVersion: Number(rows[0].draft_version),
    status: rows[0].status,
    source: rows[0].source,
    structuredContent,
    validation: rows[0].validation_snapshot_json
  }
}

export interface CollaboratorContractingItem {
  caseId: string
  caseKind: WorkforceContractingCaseKind
  status: WorkforceContractingCaseStatus
  jurisdictionPackCode: string
  authoritativeLanguage: 'es-CL' | 'en-US'
  signatureReadinessStatus: ContractingCaseProjection['signatureReadinessStatus']
  nextActionCode: string
  updatedAt: string
}

/**
 * Collaborator self reader (/my/offers + /my/contracts). Honest status only, no
 * legal text body. Scoped by the subject's own identity profile (anti-IDOR).
 */
export const getOwnContractingSummary = async (
  identityProfileId: string,
  caseKind?: WorkforceContractingCaseKind
): Promise<CollaboratorContractingItem[]> => {
  const params: unknown[] = [identityProfileId]
  let kindFilter = ''

  if (caseKind) {
    params.push(caseKind)
    kindFilter = ` AND c.case_kind = $${params.length}`
  }

  const rows = await runGreenhousePostgresQuery<CaseRowWithExtras>(
    `SELECT ${CASE_COLUMNS.split(',').map(col => `c.${col.trim()}`).join(', ')},
            NULL::text AS subject_name,
            ld.validation_snapshot_json AS latest_validation,
            ld.draft_version AS latest_draft_version
     FROM greenhouse_hr.workforce_contracting_cases c
     ${LATEST_DRAFT_LATERAL}
     WHERE c.subject_identity_profile_id = $1${kindFilter}
     ORDER BY c.updated_at DESC`,
    params
  )

  return rows.map(row => {
    const contractingCase = mapCaseRow(row as never)
    const projection = projectCase(contractingCase, row.latest_validation)

    return {
      caseId: contractingCase.caseId,
      caseKind: contractingCase.caseKind,
      status: contractingCase.status,
      jurisdictionPackCode: contractingCase.jurisdictionPackCode,
      authoritativeLanguage: contractingCase.authoritativeLanguage,
      signatureReadinessStatus: projection.signatureReadinessStatus,
      nextActionCode: projection.nextActionCode,
      updatedAt: contractingCase.updatedAt
    }
  })
}
