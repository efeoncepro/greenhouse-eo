import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { getOperatingEntityIdentity } from '@/lib/account-360/organization-identity'
import { resolveInitialApprovalAuthority } from '@/lib/approval-authority/resolver'
import {
  getWorkflowApprovalSnapshotForStage,
  upsertWorkflowApprovalSnapshotInTransaction
} from '@/lib/approval-authority/store'
import { query, withTransaction } from '@/lib/db'
import { PayrollValidationError, normalizeNullableString } from '@/lib/payroll/shared'
import { storeSystemGeneratedPrivateAsset } from '@/lib/storage/greenhouse-assets'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { computeBytesSha256, computeJsonSha256 } from './document-hash'
import { renderFinalSettlementDocumentPdf } from './document-pdf'
import {
  FINAL_SETTLEMENT_DOCUMENT_TEMPLATE_CODE,
  FINAL_SETTLEMENT_DOCUMENT_TEMPLATE_VERSION,
  type FinalSettlementDocument,
  type FinalSettlementDocumentReadiness,
  type FinalSettlementDocumentSnapshot,
  type RenderFinalSettlementDocumentInput
} from './document-types'
import { getLatestFinalSettlementForCase } from './store'
import type { FinalSettlement } from './types'

type JsonRecord = Record<string, unknown>
type QueryableClient = Pick<PoolClient, 'query'>
type FinalSettlementDocumentRow = Record<string, any>

type CollaboratorRow = {
  member_id: string
  profile_id: string
  display_name: string | null
  legal_name: string | null
  primary_email: string | null
  full_name: string | null
  canonical_email: string | null
  job_title: string | null
}

type OrganizationRow = {
  organization_id: string
  legal_name: string | null
  organization_name: string
  tax_id: string | null
  tax_id_type: string | null
  legal_address: string | null
  country: string | null
}

const toTimestampString = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()

  return null
}

const toJsonRecord = (value: unknown): JsonRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}

const mapDocumentRow = (row: FinalSettlementDocumentRow): FinalSettlementDocument => ({
  finalSettlementDocumentId: row.final_settlement_document_id,
  offboardingCaseId: row.offboarding_case_id,
  finalSettlementId: row.final_settlement_id,
  settlementVersion: Number(row.settlement_version),
  documentVersion: Number(row.document_version),
  supersedesDocumentId: row.supersedes_document_id,
  memberId: row.member_id,
  profileId: row.profile_id,
  personLegalEntityRelationshipId: row.person_legal_entity_relationship_id,
  legalEntityOrganizationId: row.legal_entity_organization_id,
  documentTemplateCode: row.document_template_code,
  documentTemplateVersion: row.document_template_version,
  documentStatus: row.document_status,
  renderStatus: row.render_status,
  signatureStatus: row.signature_status,
  snapshot: toJsonRecord(row.snapshot_json) as unknown as FinalSettlementDocumentSnapshot,
  snapshotHash: row.snapshot_hash,
  contentHash: row.content_hash,
  assetId: row.asset_id,
  pdfAssetId: row.pdf_asset_id,
  approvalSnapshotId: row.approval_snapshot_id,
  readiness: toJsonRecord(row.readiness_json) as unknown as FinalSettlementDocumentReadiness,
  renderError: row.render_error,
  reviewRequestedAt: toTimestampString(row.review_requested_at),
  reviewRequestedByUserId: row.review_requested_by_user_id,
  approvedAt: toTimestampString(row.approved_at),
  approvedByUserId: row.approved_by_user_id,
  issuedAt: toTimestampString(row.issued_at),
  issuedByUserId: row.issued_by_user_id,
  signatureEvidenceAssetId: row.signature_evidence_asset_id,
  signatureEvidenceRef: toJsonRecord(row.signature_evidence_ref),
  signedOrRatifiedAt: toTimestampString(row.signed_or_ratified_at),
  signedOrRatifiedByUserId: row.signed_or_ratified_by_user_id,
  workerReservationOfRights: Boolean(row.worker_reservation_of_rights),
  workerReservationNotes: row.worker_reservation_notes,
  rejectedByWorkerAt: toTimestampString(row.rejected_by_worker_at),
  rejectedByWorkerByUserId: row.rejected_by_worker_by_user_id,
  rejectedByWorkerReason: row.rejected_by_worker_reason,
  voidedAt: toTimestampString(row.voided_at),
  voidedByUserId: row.voided_by_user_id,
  voidReason: row.void_reason,
  cancelledAt: toTimestampString(row.cancelled_at),
  cancelledByUserId: row.cancelled_by_user_id,
  cancelReason: row.cancel_reason,
  createdByUserId: row.created_by_user_id,
  updatedByUserId: row.updated_by_user_id,
  createdAt: toTimestampString(row.created_at) ?? '',
  updatedAt: toTimestampString(row.updated_at) ?? ''
})

const queryRows = async <T extends Record<string, unknown>>(text: string, values: unknown[] = [], client?: QueryableClient) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return query<T>(text, values)
}

const getCollaboratorSnapshot = async (memberId: string, profileId: string): Promise<FinalSettlementDocumentSnapshot['collaborator']> => {
  const rows = await queryRows<CollaboratorRow>(
    `
      SELECT
        m.member_id,
        ip.profile_id,
        m.display_name,
        m.legal_name,
        m.primary_email,
        ip.full_name,
        ip.canonical_email,
        COALESCE(ip.job_title, pm.role_label) AS job_title
      FROM greenhouse_core.members m
      JOIN greenhouse_core.identity_profiles ip
        ON ip.profile_id = COALESCE(m.identity_profile_id, $2)
      LEFT JOIN greenhouse_core.person_memberships pm
        ON pm.profile_id = ip.profile_id
       AND pm.active = TRUE
       AND pm.is_primary = TRUE
      WHERE m.member_id = $1
      LIMIT 1
    `,
    [memberId, profileId]
  )

  const row = rows[0]

  if (!row) {
    throw new PayrollValidationError('Collaborator snapshot not found for final settlement document.', 409)
  }

  return {
    memberId: row.member_id,
    profileId: row.profile_id,
    displayName: row.display_name,
    legalName: row.legal_name ?? row.full_name,
    primaryEmail: row.primary_email ?? row.canonical_email,
    taxId: null,
    jobTitle: row.job_title
  }
}

const getEmployerSnapshot = async (
  legalEntityOrganizationId: string | null
): Promise<FinalSettlementDocumentSnapshot['employer']> => {
  if (legalEntityOrganizationId) {
    const rows = await queryRows<OrganizationRow>(
      `
        SELECT organization_id, legal_name, organization_name, tax_id, tax_id_type, legal_address, country
        FROM greenhouse_core.organizations
        WHERE organization_id = $1
          AND active = TRUE
        LIMIT 1
      `,
      [legalEntityOrganizationId]
    )

    const row = rows[0]

    if (row) {
      return {
        organizationId: row.organization_id,
        legalName: row.legal_name ?? row.organization_name,
        taxId: row.tax_id,
        taxIdType: row.tax_id_type,
        legalAddress: row.legal_address,
        country: row.country ?? 'CL',
        source: 'settlement_legal_entity'
      }
    }
  }

  const operatingEntity = await getOperatingEntityIdentity()

  if (!operatingEntity) {
    throw new PayrollValidationError('Operating legal entity is required to render a final settlement document.', 409)
  }

  return {
    organizationId: operatingEntity.organizationId,
    legalName: operatingEntity.legalName,
    taxId: operatingEntity.taxId,
    taxIdType: operatingEntity.taxIdType,
    legalAddress: operatingEntity.legalAddress,
    country: operatingEntity.country,
    source: 'operating_entity_fallback'
  }
}

const buildDocumentReadiness = (settlement: FinalSettlement, employerSource: string): FinalSettlementDocumentReadiness => {
  const checks: FinalSettlementDocumentReadiness['checks'] = [
    {
      code: 'settlement_approved',
      status: settlement.calculationStatus === 'approved' ? 'passed' : 'blocked',
      severity: 'blocker',
      message: 'La liquidacion final debe estar aprobada antes de renderizar el finiquito.'
    },
    {
      code: 'settlement_ready',
      status: settlement.readinessHasBlockers ? 'blocked' : 'passed',
      severity: 'blocker',
      message: 'El settlement aprobado no debe tener blockers de readiness.'
    },
    {
      code: 'legal_entity_source',
      status: employerSource === 'settlement_legal_entity' ? 'passed' : 'warning',
      severity: 'warning',
      message: employerSource === 'settlement_legal_entity'
        ? 'La entidad legal viene del settlement aprobado.'
        : 'La entidad legal se resolvio desde operating entity porque el settlement no la traia.'
    }
  ]

  const hasBlockers = checks.some(check => check.status === 'blocked')
  const hasWarnings = checks.some(check => check.status === 'warning')

  return {
    status: hasBlockers ? 'blocked' : hasWarnings ? 'needs_review' : 'ready',
    hasBlockers,
    checks
  }
}

const buildDocumentSnapshot = async (settlement: FinalSettlement): Promise<{
  snapshot: FinalSettlementDocumentSnapshot
  readiness: FinalSettlementDocumentReadiness
}> => {
  const [collaborator, employer] = await Promise.all([
    getCollaboratorSnapshot(settlement.memberId, settlement.profileId),
    getEmployerSnapshot(settlement.legalEntityOrganizationId)
  ])

  const readiness = buildDocumentReadiness(settlement, employer.source)
  const generatedAt = new Date().toISOString()

  return {
    snapshot: {
      schemaVersion: 1,
      generatedAt,
      documentTemplateCode: FINAL_SETTLEMENT_DOCUMENT_TEMPLATE_CODE,
      documentTemplateVersion: FINAL_SETTLEMENT_DOCUMENT_TEMPLATE_VERSION,
      officialReferences: [
        {
          code: 'dt_finiquito_plazo',
          label: 'DT: plazo para otorgar finiquito',
          url: 'https://dt.gob.cl/portal/1628/w3-article-60613.html',
          verifiedAt: '2026-05-04'
        },
        {
          code: 'dt_finiquito_ratificacion',
          label: 'DT: ratificacion de finiquito',
          url: 'https://www.dt.gob.cl/portal/1626/w3-article-117245.html',
          verifiedAt: '2026-05-04'
        },
        {
          code: 'dt_cotizaciones_termino',
          label: 'DT: cotizaciones al termino de contrato',
          url: 'https://www.dt.gob.cl/portal/1628/w3-article-60573.html',
          verifiedAt: '2026-05-04'
        }
      ],
      finalSettlement: {
        finalSettlementId: settlement.finalSettlementId,
        offboardingCaseId: settlement.offboardingCaseId,
        settlementVersion: settlement.settlementVersion,
        memberId: settlement.memberId,
        profileId: settlement.profileId,
        personLegalEntityRelationshipId: settlement.personLegalEntityRelationshipId,
        legalEntityOrganizationId: settlement.legalEntityOrganizationId,
        compensationVersionId: settlement.compensationVersionId,
        effectiveDate: settlement.effectiveDate,
        lastWorkingDay: settlement.lastWorkingDay,
        hireDateSnapshot: settlement.hireDateSnapshot,
        contractEndDateSnapshot: settlement.contractEndDateSnapshot,
        separationType: settlement.separationType,
        contractTypeSnapshot: settlement.contractTypeSnapshot,
        payRegimeSnapshot: settlement.payRegimeSnapshot,
        payrollViaSnapshot: settlement.payrollViaSnapshot,
        currency: settlement.currency,
        grossTotal: settlement.grossTotal,
        deductionTotal: settlement.deductionTotal,
        netPayable: settlement.netPayable,
        approvedAt: settlement.approvedAt,
        approvedByUserId: settlement.approvedByUserId
      },
      collaborator,
      employer,
      sourceSnapshot: settlement.sourceSnapshot,
      breakdown: settlement.breakdown,
      explanation: settlement.explanation,
      readiness: settlement.readiness
    },
    readiness
  }
}

const insertDocumentEvent = async (
  client: PoolClient,
  {
    document,
    eventType,
    fromStatus,
    toStatus,
    actorUserId,
    reason,
    payload
  }: {
    document: FinalSettlementDocument
    eventType: string
    fromStatus?: string | null
    toStatus?: string | null
    actorUserId: string
    reason?: string | null
    payload?: Record<string, unknown>
  }
) => {
  await client.query(
    `
      INSERT INTO greenhouse_payroll.final_settlement_document_events (
        event_id,
        final_settlement_document_id,
        offboarding_case_id,
        final_settlement_id,
        event_type,
        from_status,
        to_status,
        actor_user_id,
        reason,
        payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
    `,
    [
      `final-settlement-document-event-${randomUUID()}`,
      document.finalSettlementDocumentId,
      document.offboardingCaseId,
      document.finalSettlementId,
      eventType,
      fromStatus ?? null,
      toStatus ?? null,
      actorUserId,
      reason ?? null,
      JSON.stringify(payload ?? {})
    ]
  )
}

const publishDocumentEvent = async (
  client: PoolClient,
  eventType: string,
  document: FinalSettlementDocument,
  payload: Record<string, unknown> = {}
) => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.payrollFinalSettlementDocument,
      aggregateId: document.finalSettlementDocumentId,
      eventType,
      payload: {
        schemaVersion: 1,
        finalSettlementDocumentId: document.finalSettlementDocumentId,
        offboardingCaseId: document.offboardingCaseId,
        finalSettlementId: document.finalSettlementId,
        memberId: document.memberId,
        documentVersion: document.documentVersion,
        status: document.documentStatus,
        snapshotHash: document.snapshotHash,
        ...payload
      }
    },
    client
  )
}

export const listFinalSettlementDocumentsForCase = async (offboardingCaseId: string) => {
  const rows = await queryRows<FinalSettlementDocumentRow>(
    `
      SELECT *
      FROM greenhouse_payroll.final_settlement_documents
      WHERE offboarding_case_id = $1
      ORDER BY document_version DESC, created_at DESC
    `,
    [offboardingCaseId]
  )

  return rows.map(mapDocumentRow)
}

export const getLatestFinalSettlementDocumentForCase = async (offboardingCaseId: string) => {
  const rows = await queryRows<FinalSettlementDocumentRow>(
    `
      SELECT *
      FROM greenhouse_payroll.final_settlement_documents
      WHERE offboarding_case_id = $1
      ORDER BY document_version DESC, created_at DESC
      LIMIT 1
    `,
    [offboardingCaseId]
  )

  return rows[0] ? mapDocumentRow(rows[0]) : null
}

export const renderFinalSettlementDocumentForCase = async (input: RenderFinalSettlementDocumentInput) => {
  const settlement = await getLatestFinalSettlementForCase(input.offboardingCaseId)

  if (!settlement) {
    throw new PayrollValidationError('Final settlement not found.', 404)
  }

  if (settlement.calculationStatus !== 'approved') {
    throw new PayrollValidationError('Only approved final settlements can render a finiquito document.', 409, {
      status: settlement.calculationStatus
    })
  }

  const { snapshot, readiness } = await buildDocumentSnapshot(settlement)

  if (readiness.hasBlockers) {
    throw new PayrollValidationError('Final settlement document is not ready to render.', 409, readiness)
  }

  const documentId = `final-settlement-document-${randomUUID()}`
  const snapshotHash = computeJsonSha256(snapshot)
  const pdfBytes = await renderFinalSettlementDocumentPdf(snapshot)
  const contentHash = computeBytesSha256(pdfBytes)
  const fileName = `finiquito-${settlement.memberId}-v${settlement.settlementVersion}.pdf`

  const asset = await storeSystemGeneratedPrivateAsset({
    ownerAggregateType: 'final_settlement_document',
    ownerAggregateId: documentId,
    ownerMemberId: settlement.memberId,
    fileName,
    mimeType: 'application/pdf',
    bytes: pdfBytes,
    actorUserId: input.actorUserId,
    metadata: {
      finalSettlementId: settlement.finalSettlementId,
      offboardingCaseId: settlement.offboardingCaseId,
      settlementVersion: settlement.settlementVersion,
      snapshotHash,
      contentHash
    }
  })

  return withTransaction(async client => {
    const currentRows = await client.query<FinalSettlementDocumentRow>(
      `
        SELECT *
        FROM greenhouse_payroll.final_settlement_documents
        WHERE final_settlement_id = $1
        ORDER BY document_version DESC, created_at DESC
        FOR UPDATE
      `,
      [settlement.finalSettlementId]
    )

    const latest = currentRows.rows[0] ? mapDocumentRow(currentRows.rows[0]) : null
    const active = currentRows.rows.map(mapDocumentRow).find(doc => !['rejected', 'voided', 'superseded', 'cancelled'].includes(doc.documentStatus))

    if (active && !input.reissue) {
      return active
    }

    if (active && input.reissue) {
      const supersedeRows = await client.query<FinalSettlementDocumentRow>(
        `
          UPDATE greenhouse_payroll.final_settlement_documents
          SET document_status = 'superseded',
              updated_by_user_id = $2
          WHERE final_settlement_document_id = $1
          RETURNING *
        `,
        [active.finalSettlementDocumentId, input.actorUserId]
      )

      const superseded = mapDocumentRow(supersedeRows.rows[0])

      await insertDocumentEvent(client, {
        document: superseded,
        eventType: EVENT_TYPES.hrFinalSettlementDocumentSuperseded,
        fromStatus: active.documentStatus,
        toStatus: 'superseded',
        actorUserId: input.actorUserId,
        reason: input.reason ?? null
      })
      await publishDocumentEvent(client, EVENT_TYPES.hrFinalSettlementDocumentSuperseded, superseded)
    }

    const documentVersion = (latest?.documentVersion ?? 0) + 1

    const result = await client.query<FinalSettlementDocumentRow>(
      `
        INSERT INTO greenhouse_payroll.final_settlement_documents (
          final_settlement_document_id,
          offboarding_case_id,
          final_settlement_id,
          settlement_version,
          document_version,
          supersedes_document_id,
          member_id,
          profile_id,
          person_legal_entity_relationship_id,
          legal_entity_organization_id,
          document_template_code,
          document_template_version,
          document_status,
          render_status,
          snapshot_json,
          snapshot_hash,
          content_hash,
          asset_id,
          pdf_asset_id,
          readiness_json,
          created_by_user_id,
          updated_by_user_id
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, 'rendered', 'rendered', $13::jsonb, $14, $15, $16, $16, $17::jsonb, $18, $18
        )
        RETURNING *
      `,
      [
        documentId,
        settlement.offboardingCaseId,
        settlement.finalSettlementId,
        settlement.settlementVersion,
        documentVersion,
        active?.finalSettlementDocumentId ?? null,
        settlement.memberId,
        settlement.profileId,
        settlement.personLegalEntityRelationshipId,
        snapshot.employer.organizationId,
        FINAL_SETTLEMENT_DOCUMENT_TEMPLATE_CODE,
        FINAL_SETTLEMENT_DOCUMENT_TEMPLATE_VERSION,
        JSON.stringify(snapshot),
        snapshotHash,
        contentHash,
        asset.assetId,
        JSON.stringify(readiness),
        input.actorUserId
      ]
    )

    const document = mapDocumentRow(result.rows[0])

    await insertDocumentEvent(client, {
      document,
      eventType: EVENT_TYPES.hrFinalSettlementDocumentRendered,
      fromStatus: null,
      toStatus: document.documentStatus,
      actorUserId: input.actorUserId,
      payload: { reissue: Boolean(input.reissue), pdfAssetId: document.pdfAssetId }
    })
    await publishDocumentEvent(client, EVENT_TYPES.hrFinalSettlementDocumentRendered, document)

    return document
  })
}

const getCurrentDocumentForUpdate = async (client: PoolClient, offboardingCaseId: string) => {
  const rows = await client.query<FinalSettlementDocumentRow>(
    `
      SELECT *
      FROM greenhouse_payroll.final_settlement_documents
      WHERE offboarding_case_id = $1
      ORDER BY document_version DESC, created_at DESC
      LIMIT 1
      FOR UPDATE
    `,
    [offboardingCaseId]
  )

  const document = rows.rows[0] ? mapDocumentRow(rows.rows[0]) : null

  if (!document) {
    throw new PayrollValidationError('Final settlement document not found.', 404)
  }

  return document
}

const assertSnapshotHashMatches = (document: FinalSettlementDocument) => {
  const currentHash = computeJsonSha256(document.snapshot)

  if (currentHash !== document.snapshotHash) {
    throw new PayrollValidationError('Final settlement document snapshot hash mismatch.', 409, {
      expected: document.snapshotHash,
      actual: currentHash
    })
  }
}

export const submitFinalSettlementDocumentForReview = async ({
  offboardingCaseId,
  actorUserId
}: {
  offboardingCaseId: string
  actorUserId: string
}) => withTransaction(async client => {
  const current = await getCurrentDocumentForUpdate(client, offboardingCaseId)

  if (current.documentStatus !== 'rendered') {
    throw new PayrollValidationError('Only rendered documents can be submitted for review.', 409, {
      status: current.documentStatus
    })
  }

  assertSnapshotHashMatches(current)

  const resolution = await resolveInitialApprovalAuthority({
    workflowDomain: 'offboarding',
    subjectMemberId: current.memberId
  })

  const approvalSnapshot = await upsertWorkflowApprovalSnapshotInTransaction({
    workflowDomain: 'offboarding',
    workflowEntityId: current.finalSettlementDocumentId,
    subjectMemberId: current.memberId,
    resolution,
    createdByUserId: actorUserId,
    client
  })

  const result = await client.query<FinalSettlementDocumentRow>(
    `
      UPDATE greenhouse_payroll.final_settlement_documents
      SET document_status = 'in_review',
          approval_snapshot_id = $2,
          review_requested_at = now(),
          review_requested_by_user_id = $3,
          updated_by_user_id = $3
      WHERE final_settlement_document_id = $1
      RETURNING *
    `,
    [current.finalSettlementDocumentId, approvalSnapshot.snapshotId, actorUserId]
  )

  const document = mapDocumentRow(result.rows[0])

  await insertDocumentEvent(client, {
    document,
    eventType: EVENT_TYPES.hrFinalSettlementDocumentSubmittedForReview,
    fromStatus: current.documentStatus,
    toStatus: document.documentStatus,
    actorUserId
  })
  await publishDocumentEvent(client, EVENT_TYPES.hrFinalSettlementDocumentSubmittedForReview, document)

  return document
})

export const approveFinalSettlementDocumentForCase = async ({
  offboardingCaseId,
  actorUserId
}: {
  offboardingCaseId: string
  actorUserId: string
}) => withTransaction(async client => {
  const current = await getCurrentDocumentForUpdate(client, offboardingCaseId)

  if (current.documentStatus !== 'in_review') {
    throw new PayrollValidationError('Only documents in review can be approved.', 409, {
      status: current.documentStatus
    })
  }

  assertSnapshotHashMatches(current)

  const approvalSnapshot = current.approvalSnapshotId
    ? await getWorkflowApprovalSnapshotForStage({
      workflowDomain: 'offboarding',
      workflowEntityId: current.finalSettlementDocumentId,
      stageCode: 'hr_review',
      client
    })
    : null

  if (!approvalSnapshot) {
    throw new PayrollValidationError('Approval snapshot is required before document approval.', 409)
  }

  const result = await client.query<FinalSettlementDocumentRow>(
    `
      UPDATE greenhouse_payroll.final_settlement_documents
      SET document_status = 'approved',
          approved_at = now(),
          approved_by_user_id = $2,
          updated_by_user_id = $2
      WHERE final_settlement_document_id = $1
      RETURNING *
    `,
    [current.finalSettlementDocumentId, actorUserId]
  )

  const document = mapDocumentRow(result.rows[0])

  await insertDocumentEvent(client, {
    document,
    eventType: EVENT_TYPES.hrFinalSettlementDocumentApproved,
    fromStatus: current.documentStatus,
    toStatus: document.documentStatus,
    actorUserId
  })
  await publishDocumentEvent(client, EVENT_TYPES.hrFinalSettlementDocumentApproved, document)

  return document
})

export const issueFinalSettlementDocumentForCase = async ({
  offboardingCaseId,
  actorUserId
}: {
  offboardingCaseId: string
  actorUserId: string
}) => withTransaction(async client => {
  const current = await getCurrentDocumentForUpdate(client, offboardingCaseId)

  if (current.documentStatus !== 'approved') {
    throw new PayrollValidationError('Only approved documents can be issued.', 409, {
      status: current.documentStatus
    })
  }

  assertSnapshotHashMatches(current)

  if (!current.pdfAssetId || !current.approvedByUserId || current.readiness.hasBlockers) {
    throw new PayrollValidationError('Document is missing readiness, approval or PDF asset evidence.', 409, current.readiness)
  }

  const result = await client.query<FinalSettlementDocumentRow>(
    `
      UPDATE greenhouse_payroll.final_settlement_documents
      SET document_status = 'issued',
          signature_status = 'external_process_pending',
          issued_at = now(),
          issued_by_user_id = $2,
          updated_by_user_id = $2
      WHERE final_settlement_document_id = $1
      RETURNING *
    `,
    [current.finalSettlementDocumentId, actorUserId]
  )

  const document = mapDocumentRow(result.rows[0])

  await insertDocumentEvent(client, {
    document,
    eventType: EVENT_TYPES.hrFinalSettlementDocumentIssued,
    fromStatus: current.documentStatus,
    toStatus: document.documentStatus,
    actorUserId,
    payload: { pdfAssetId: document.pdfAssetId }
  })
  await publishDocumentEvent(client, EVENT_TYPES.hrFinalSettlementDocumentIssued, document)

  return document
})

export const voidFinalSettlementDocumentForCase = async ({
  offboardingCaseId,
  actorUserId,
  reason
}: {
  offboardingCaseId: string
  actorUserId: string
  reason: string
}) => withTransaction(async client => {
  const normalizedReason = normalizeNullableString(reason)

  if (!normalizedReason) {
    throw new PayrollValidationError('Void reason is required.', 400)
  }

  const current = await getCurrentDocumentForUpdate(client, offboardingCaseId)

  if (['signed_or_ratified', 'voided', 'cancelled'].includes(current.documentStatus)) {
    throw new PayrollValidationError('This final settlement document cannot be voided from its current status.', 409, {
      status: current.documentStatus
    })
  }

  const result = await client.query<FinalSettlementDocumentRow>(
    `
      UPDATE greenhouse_payroll.final_settlement_documents
      SET document_status = 'voided',
          signature_status = 'voided',
          voided_at = now(),
          voided_by_user_id = $2,
          void_reason = $3,
          updated_by_user_id = $2
      WHERE final_settlement_document_id = $1
      RETURNING *
    `,
    [current.finalSettlementDocumentId, actorUserId, normalizedReason]
  )

  const document = mapDocumentRow(result.rows[0])

  await insertDocumentEvent(client, {
    document,
    eventType: EVENT_TYPES.hrFinalSettlementDocumentVoided,
    fromStatus: current.documentStatus,
    toStatus: document.documentStatus,
    actorUserId,
    reason: normalizedReason
  })
  await publishDocumentEvent(client, EVENT_TYPES.hrFinalSettlementDocumentVoided, document, { reason: normalizedReason })

  return document
})

export const rejectFinalSettlementDocumentByWorkerForCase = async ({
  offboardingCaseId,
  actorUserId,
  reason
}: {
  offboardingCaseId: string
  actorUserId: string
  reason: string
}) => withTransaction(async client => {
  const normalizedReason = normalizeNullableString(reason)

  if (!normalizedReason) {
    throw new PayrollValidationError('Worker rejection reason is required.', 400)
  }

  const current = await getCurrentDocumentForUpdate(client, offboardingCaseId)

  if (!['issued', 'approved'].includes(current.documentStatus)) {
    throw new PayrollValidationError('Only approved or issued documents can be rejected by the worker.', 409, {
      status: current.documentStatus
    })
  }

  const result = await client.query<FinalSettlementDocumentRow>(
    `
      UPDATE greenhouse_payroll.final_settlement_documents
      SET document_status = 'rejected',
          signature_status = 'rejected',
          rejected_by_worker_at = now(),
          rejected_by_worker_by_user_id = $2,
          rejected_by_worker_reason = $3,
          updated_by_user_id = $2
      WHERE final_settlement_document_id = $1
      RETURNING *
    `,
    [current.finalSettlementDocumentId, actorUserId, normalizedReason]
  )

  const document = mapDocumentRow(result.rows[0])

  await insertDocumentEvent(client, {
    document,
    eventType: EVENT_TYPES.hrFinalSettlementDocumentRejected,
    fromStatus: current.documentStatus,
    toStatus: document.documentStatus,
    actorUserId,
    reason: normalizedReason
  })
  await publishDocumentEvent(client, EVENT_TYPES.hrFinalSettlementDocumentRejected, document, { reason: normalizedReason })

  return document
})

export const markFinalSettlementDocumentSignedOrRatifiedForCase = async ({
  offboardingCaseId,
  actorUserId,
  signatureEvidenceAssetId,
  signatureEvidenceRef,
  workerReservationOfRights,
  workerReservationNotes
}: {
  offboardingCaseId: string
  actorUserId: string
  signatureEvidenceAssetId?: string | null
  signatureEvidenceRef?: Record<string, unknown> | null
  workerReservationOfRights?: boolean
  workerReservationNotes?: string | null
}) => withTransaction(async client => {
  const evidenceRef = toJsonRecord(signatureEvidenceRef)

  if (!signatureEvidenceAssetId && Object.keys(evidenceRef).length === 0) {
    throw new PayrollValidationError('Signature or ratification evidence is required.', 400)
  }

  const current = await getCurrentDocumentForUpdate(client, offboardingCaseId)

  if (current.documentStatus !== 'issued') {
    throw new PayrollValidationError('Only issued documents can be marked signed or ratified.', 409, {
      status: current.documentStatus
    })
  }

  const result = await client.query<FinalSettlementDocumentRow>(
    `
      UPDATE greenhouse_payroll.final_settlement_documents
      SET document_status = 'signed_or_ratified',
          signature_status = 'signed_or_ratified',
          signature_evidence_asset_id = $2,
          signature_evidence_ref = $3::jsonb,
          signed_or_ratified_at = now(),
          signed_or_ratified_by_user_id = $4,
          worker_reservation_of_rights = $5,
          worker_reservation_notes = $6,
          updated_by_user_id = $4
      WHERE final_settlement_document_id = $1
      RETURNING *
    `,
    [
      current.finalSettlementDocumentId,
      signatureEvidenceAssetId ?? null,
      JSON.stringify(evidenceRef),
      actorUserId,
      Boolean(workerReservationOfRights),
      normalizeNullableString(workerReservationNotes)
    ]
  )

  const document = mapDocumentRow(result.rows[0])

  await insertDocumentEvent(client, {
    document,
    eventType: EVENT_TYPES.hrFinalSettlementDocumentSignedOrRatified,
    fromStatus: current.documentStatus,
    toStatus: document.documentStatus,
    actorUserId,
    payload: {
      signatureEvidenceAssetId: document.signatureEvidenceAssetId,
      hasExternalEvidenceRef: Object.keys(document.signatureEvidenceRef).length > 0,
      workerReservationOfRights: document.workerReservationOfRights
    }
  })
  await publishDocumentEvent(client, EVENT_TYPES.hrFinalSettlementDocumentSignedOrRatified, document, {
    workerReservationOfRights: document.workerReservationOfRights
  })

  return document
})

export const getFinalSettlementDocumentDownloadUrl = (document: FinalSettlementDocument) =>
  document.pdfAssetId ? `/api/assets/private/${encodeURIComponent(document.pdfAssetId)}` : null
