import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  type ContractLanguage,
  type SignableFormat,
  type SignatureProvider,
  type WorkforceContractingCase,
  type WorkforceContractingCaseKind,
  type WorkforceContractingCaseStatus,
  type WorkforceContractingDraft,
  type WorkforceContractingDraftSource,
  type WorkforceContractingDraftStatus,
  type WorkforceContractingValidationResult
} from './types'

// Read helper that works standalone (shared pool) or inside a transaction (PoolClient).
const runQuery = async <T extends Record<string, unknown>>(
  sql: string,
  params: unknown[],
  client?: PoolClient
): Promise<T[]> => {
  if (client) {
    const result = await client.query<T>(sql, params)

    return result.rows
  }

  return runGreenhousePostgresQuery<T>(sql, params)
}

const toIso = (value: unknown): string | null => {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()

  return String(value)
}

const toIsoRequired = (value: unknown): string => toIso(value) ?? ''

// ── Cases ──

type CaseRow = {
  case_id: string
  case_kind: WorkforceContractingCaseKind
  subject_identity_profile_id: string
  member_id: string | null
  work_relationship_onboarding_case_id: string | null
  source_offer_case_id: string | null
  operating_entity_organization_id: string
  jurisdiction_pack_code: string
  required_languages: string[] | null
  authoritative_language: ContractLanguage
  signable_format: SignableFormat
  signature_provider: SignatureProvider
  status: WorkforceContractingCaseStatus
  target_start_date: unknown
  contract_type_snapshot: string | null
  pay_regime_snapshot: string | null
  payroll_via_snapshot: string | null
  legal_review_reference: string | null
  pdf_asset_id: string | null
  signed_pdf_asset_id: string | null
  signature_request_id: string | null
  created_by_user_id: string | null
  voided_at: unknown
  void_reason: string | null
  metadata_json: Record<string, unknown> | null
  created_at: unknown
  updated_at: unknown
}

export const CASE_COLUMNS = `
  case_id, case_kind, subject_identity_profile_id, member_id,
  work_relationship_onboarding_case_id, source_offer_case_id,
  operating_entity_organization_id, jurisdiction_pack_code, required_languages,
  authoritative_language, signable_format, signature_provider, status,
  target_start_date, contract_type_snapshot, pay_regime_snapshot, payroll_via_snapshot,
  legal_review_reference, pdf_asset_id, signed_pdf_asset_id, signature_request_id,
  created_by_user_id, voided_at, void_reason, metadata_json,
  created_at, updated_at
`

export const mapCaseRow = (row: CaseRow): WorkforceContractingCase => ({
  caseId: row.case_id,
  caseKind: row.case_kind,
  subjectIdentityProfileId: row.subject_identity_profile_id,
  memberId: row.member_id,
  workRelationshipOnboardingCaseId: row.work_relationship_onboarding_case_id,
  sourceOfferCaseId: row.source_offer_case_id,
  operatingEntityOrganizationId: row.operating_entity_organization_id,
  jurisdictionPackCode: row.jurisdiction_pack_code,
  requiredLanguages: (row.required_languages ?? []) as ContractLanguage[],
  authoritativeLanguage: row.authoritative_language,
  signableFormat: row.signable_format,
  signatureProvider: row.signature_provider,
  status: row.status,
  targetStartDate: toIso(row.target_start_date)?.slice(0, 10) ?? null,
  contractTypeSnapshot: row.contract_type_snapshot,
  payRegimeSnapshot: row.pay_regime_snapshot,
  payrollViaSnapshot: row.payroll_via_snapshot,
  legalReviewReference: row.legal_review_reference,
  pdfAssetId: row.pdf_asset_id,
  signedPdfAssetId: row.signed_pdf_asset_id,
  signatureRequestId: row.signature_request_id,
  createdByUserId: row.created_by_user_id,
  voidedAt: toIso(row.voided_at),
  voidReason: row.void_reason,
  metadataJson: row.metadata_json ?? {},
  createdAt: toIsoRequired(row.created_at),
  updatedAt: toIsoRequired(row.updated_at)
})

export const getCaseById = async (
  caseId: string,
  client?: PoolClient,
  forUpdate = false
): Promise<WorkforceContractingCase | null> => {
  const rows = await runQuery<CaseRow>(
    `SELECT ${CASE_COLUMNS}
     FROM greenhouse_hr.workforce_contracting_cases
     WHERE case_id = $1${forUpdate ? ' FOR UPDATE' : ''}`,
    [caseId],
    client
  )

  return rows[0] ? mapCaseRow(rows[0]) : null
}

// ── Drafts ──

type DraftRow = {
  draft_id: string
  case_id: string
  draft_version: number
  source: WorkforceContractingDraftSource
  status: WorkforceContractingDraftStatus
  structured_content_json: Record<string, unknown>
  validation_snapshot_json: WorkforceContractingValidationResult | null
  language_parity_snapshot_json: Record<string, unknown> | null
  content_hash: string
  approved_at: unknown
  approved_by_user_id: string | null
  created_by_user_id: string | null
  created_at: unknown
  updated_at: unknown
}

export const DRAFT_COLUMNS = `
  draft_id, case_id, draft_version, source, status, structured_content_json,
  validation_snapshot_json, language_parity_snapshot_json, content_hash,
  approved_at, approved_by_user_id, created_by_user_id, created_at, updated_at
`

export const mapDraftRow = (row: DraftRow): WorkforceContractingDraft => ({
  draftId: row.draft_id,
  caseId: row.case_id,
  draftVersion: Number(row.draft_version),
  source: row.source,
  status: row.status,
  structuredContentJson: row.structured_content_json,
  validationSnapshotJson: row.validation_snapshot_json,
  languageParitySnapshotJson: row.language_parity_snapshot_json,
  contentHash: row.content_hash,
  approvedAt: toIso(row.approved_at),
  approvedByUserId: row.approved_by_user_id,
  createdByUserId: row.created_by_user_id,
  createdAt: toIsoRequired(row.created_at),
  updatedAt: toIsoRequired(row.updated_at)
})

export const getDraftById = async (
  draftId: string,
  client?: PoolClient,
  forUpdate = false
): Promise<WorkforceContractingDraft | null> => {
  const rows = await runQuery<DraftRow>(
    `SELECT ${DRAFT_COLUMNS}
     FROM greenhouse_hr.workforce_contracting_drafts
     WHERE draft_id = $1${forUpdate ? ' FOR UPDATE' : ''}`,
    [draftId],
    client
  )

  return rows[0] ? mapDraftRow(rows[0]) : null
}

/** Highest draft_version for a case (0 when none exist), within the active tx. */
export const getMaxDraftVersion = async (caseId: string, client?: PoolClient): Promise<number> => {
  const rows = await runQuery<{ max_version: number | null }>(
    `SELECT MAX(draft_version) AS max_version
     FROM greenhouse_hr.workforce_contracting_drafts
     WHERE case_id = $1`,
    [caseId],
    client
  )

  return Number(rows[0]?.max_version ?? 0)
}
