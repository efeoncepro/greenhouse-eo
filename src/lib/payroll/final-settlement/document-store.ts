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

import { readFinalSettlementSnapshot } from '@/lib/person-legal-profile'

import { computeBytesSha256, computeJsonSha256 } from './document-hash'
import { renderFinalSettlementDocumentPdf } from './document-pdf'
import {
  FINAL_SETTLEMENT_DOCUMENT_TEMPLATE_CODE,
  FINAL_SETTLEMENT_DOCUMENT_TEMPLATE_VERSION,
  type FinalSettlementDocument,
  type FinalSettlementDocumentReadiness,
  type FinalSettlementDocumentSnapshot,
  type FinalSettlementMaintenanceObligation,
  type FinalSettlementRatification,
  type RenderFinalSettlementDocumentInput
} from './document-types'
import { getLatestFinalSettlementForCase } from './store'
import type { FinalSettlement } from './types'

type JsonRecord = Record<string, unknown>
type QueryableClient = Pick<PoolClient, 'query'>
type FinalSettlementDocumentRow = Record<string, any>
type CurrentSettlementRow = {
  final_settlement_id: string
  calculation_status: string
}

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

// TASK-862 Slice C — Worker address (TASK-784 person_addresses).
type WorkerAddressRow = {
  street_line_1: string | null
  city: string | null
  region: string | null
  presentation_text: string | null
}

type OrganizationRow = {
  organization_id: string
  legal_name: string | null
  organization_name: string
  tax_id: string | null
  tax_id_type: string | null
  legal_address: string | null
  country: string | null
  logo_asset_id: string | null
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

const INACTIVE_DOCUMENT_STATUSES = new Set(['rejected', 'voided', 'superseded', 'cancelled'])

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

  // TASK-784 — consume canonical person legal profile snapshot.
  // Returns CL_RUT in `taxId` only when document is verification_status='verified'.
  // Pending/rejected/archived → `taxId` stays null (no auto-trust).
  // Logs an `export_snapshot` audit row in the same query for traceability.
  let taxId: string | null = null

  try {
    const snapshot = await readFinalSettlementSnapshot(row.profile_id, null)

    if (snapshot.document?.verificationStatus === 'verified') {
      taxId = snapshot.document.valueFull
    }
  } catch {
    // Defensive: if pepper missing, secret manager down, or any reader fails,
    // the snapshot stays null — finiquito can still emit informally and the
    // reliability signal will surface the gap. Do NOT block emission on
    // person legal profile failure.
    taxId = null
  }

  // TASK-862 Slice C — Worker address from TASK-784 person_addresses.
  // Preferimos residence verified; fallback a residence pending (degraded, no blocker).
  // Cualquier error -> address fields null + readiness check worker_address_resolved
  // dispara warning (no blocker, no rompe emision).
  let addressLine1: string | null = null
  let city: string | null = null
  let region: string | null = null
  let addressPresentation: string | null = null

  try {
    const addressRows = await queryRows<WorkerAddressRow>(
      `
        SELECT street_line_1, city, region, presentation_text
        FROM greenhouse_core.person_addresses
        WHERE profile_id = $1
          AND address_type = 'residence'
          AND archived_at IS NULL
          AND rejected_at IS NULL
        ORDER BY
          CASE verification_status WHEN 'verified' THEN 0 WHEN 'pending_review' THEN 1 ELSE 2 END,
          updated_at DESC
        LIMIT 1
      `,
      [row.profile_id]
    )

    if (addressRows[0]) {
      addressLine1 = addressRows[0].street_line_1
      city = addressRows[0].city
      region = addressRows[0].region
      addressPresentation = addressRows[0].presentation_text
    }
  } catch {
    // Defensive: address gap is non-blocking; readiness check surfaces it.
    addressLine1 = null
    city = null
    region = null
    addressPresentation = null
  }

  return {
    memberId: row.member_id,
    profileId: row.profile_id,
    displayName: row.display_name,
    legalName: row.legal_name ?? row.full_name,
    primaryEmail: row.primary_email ?? row.canonical_email,
    taxId,
    jobTitle: row.job_title,
    addressLine1,
    city,
    region,
    addressPresentation
  }
}

const getEmployerSnapshot = async (
  legalEntityOrganizationId: string | null
): Promise<FinalSettlementDocumentSnapshot['employer']> => {
  if (legalEntityOrganizationId) {
    const rows = await queryRows<OrganizationRow>(
      `
        SELECT organization_id, legal_name, organization_name, tax_id, tax_id_type, legal_address, country, logo_asset_id
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
        source: 'settlement_legal_entity',
        logoAssetId: row.logo_asset_id, // TASK-862 Slice C
        // TASK-863 V1.3 — firma digital del representante legal: convención de filename
        // por RUT del empleador, normalizado sin puntos. Operador HR sube el PNG
        // transparente a `src/assets/signatures/{rut-no-puntos}.png`. V1.4 follow-up
        // migrará a FK asset privado en greenhouse_core.organizations.
        legalRepresentativeSignaturePath: row.tax_id
          ? `${String(row.tax_id).replace(/[.\s]/g, '')}.png`
          : null
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
    source: 'operating_entity_fallback',
    logoAssetId: null, // TASK-862 Slice C — fallback no expone logo; PDF cae a Greenhouse default
    // TASK-863 V1.3 — fallback path por taxId; null cuando operating entity sin RUT.
    legalRepresentativeSignaturePath: operatingEntity.taxId
      ? `${String(operatingEntity.taxId).replace(/[.\s]/g, '')}.png`
      : null
  }
}

const buildDocumentReadiness = (
  settlement: FinalSettlement,
  employer: FinalSettlementDocumentSnapshot['employer'],
  collaborator: FinalSettlementDocumentSnapshot['collaborator'],
  // TASK-862 Slice C — pre-requisitos del finiquito de renuncia voluntaria.
  resignationLetterAssetId: string | null,
  maintenanceObligation: FinalSettlementMaintenanceObligation | null
): FinalSettlementDocumentReadiness => {
  const isResignation = settlement.separationType === 'resignation'
  const workerHasAddress = Boolean(collaborator.addressLine1 || collaborator.addressPresentation)

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
      status: employer.source === 'settlement_legal_entity' ? 'passed' : 'warning',
      severity: 'warning',
      message: employer.source === 'settlement_legal_entity'
        ? 'La entidad legal viene del settlement aprobado.'
        : 'La entidad legal se resolvio desde operating entity porque el settlement no la traia.'
    },
    {
      code: 'worker_legal_identity_verified',
      status: collaborator.taxId ? 'passed' : 'blocked',
      severity: 'blocker',
      message: 'La emision formal exige RUT/documento del trabajador verificado desde Datos legales.'
    },
    {
      code: 'employer_legal_identity_present',
      status: employer.taxId && employer.legalName ? 'passed' : 'blocked',
      severity: 'blocker',
      message: 'La emision formal exige entidad legal empleadora con nombre y RUT.'
    },
    {
      code: 'net_payable_non_negative_or_authorized',
      status: settlement.netPayable >= 0 || settlement.breakdown.some(line => line.componentCode === 'authorized_deduction' && line.evidence)
        ? 'passed'
        : 'blocked',
      severity: 'blocker',
      message: 'Un liquido negativo bloquea emision salvo deduccion autorizada con evidencia estructurada.'
    },
    {
      code: 'component_policy_evidence_present',
      status: settlement.breakdown.every(line => line.policyCode && line.legalTreatment && line.taxTreatment && line.previsionalTreatment)
        ? 'passed'
        : 'blocked',
      severity: 'blocker',
      message: 'Cada linea del documento debe traer policy, tratamiento y evidencia suficiente.'
    },
    // TASK-862 Slice C — 3 readiness checks nuevos. Aplican SOLO cuando separation_type=resignation
    // (V1 scope). Otras causales heredan los 7 checks anteriores sin extension.
    {
      code: 'resignation_letter_uploaded',
      status: !isResignation || resignationLetterAssetId ? 'passed' : 'blocked',
      severity: 'blocker',
      message: 'La carta de renuncia ratificada debe subirse antes de calcular y emitir el finiquito.',
      evidence: { isResignation, resignationLetterAssetId }
    },
    {
      code: 'maintenance_obligation_declared',
      status: !isResignation || maintenanceObligation ? 'passed' : 'blocked',
      severity: 'blocker',
      message: 'La declaracion de pension de alimentos (Ley 21.389) debe registrarse antes de emitir el finiquito.',
      evidence: { isResignation, declared: Boolean(maintenanceObligation) }
    },
    {
      code: 'worker_address_resolved',
      status: workerHasAddress ? 'passed' : 'warning',
      severity: 'warning',
      message: 'El domicilio del trabajador no esta registrado. El finiquito puede emitirse pero queda como advertencia para revision HR.'
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

// TASK-862 Slice C — Read finiquito pre-reqs from the offboarding case.
// Tolera fallos defensively: si el case no tiene las columnas todavia (migration
// no aplicada en algun env), retorna nulls y los readiness checks bloquean.
const getOffboardingCasePreReqs = async (offboardingCaseId: string): Promise<{
  resignationLetterAssetId: string | null
  maintenanceObligation: FinalSettlementMaintenanceObligation | null
}> => {
  type CasePreReqRow = {
    resignation_letter_asset_id: string | null
    maintenance_obligation_json: FinalSettlementMaintenanceObligation | null
  }

  try {
    const rows = await queryRows<CasePreReqRow>(
      `
        SELECT resignation_letter_asset_id, maintenance_obligation_json
        FROM greenhouse_hr.work_relationship_offboarding_cases
        WHERE offboarding_case_id = $1
        LIMIT 1
      `,
      [offboardingCaseId]
    )

    const row = rows[0]

    return {
      resignationLetterAssetId: row?.resignation_letter_asset_id ?? null,
      maintenanceObligation: row?.maintenance_obligation_json ?? null
    }
  } catch {
    return { resignationLetterAssetId: null, maintenanceObligation: null }
  }
}

const buildDocumentSnapshot = async (settlement: FinalSettlement, ratification?: FinalSettlementRatification | null): Promise<{
  snapshot: FinalSettlementDocumentSnapshot
  readiness: FinalSettlementDocumentReadiness
}> => {
  const [collaborator, employer, preReqs] = await Promise.all([
    getCollaboratorSnapshot(settlement.memberId, settlement.profileId),
    getEmployerSnapshot(settlement.legalEntityOrganizationId),
    getOffboardingCasePreReqs(settlement.offboardingCaseId)
  ])

  const readiness = buildDocumentReadiness(
    settlement,
    employer,
    collaborator,
    preReqs.resignationLetterAssetId,
    preReqs.maintenanceObligation
  )

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
          code: 'dt_feriado_proporcional',
          label: 'DT: calculo de feriado proporcional',
          url: 'https://www.dt.gob.cl/portal/1628/w3-article-60200.html',
          verifiedAt: '2026-05-05'
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
      readiness: settlement.readiness,
      documentReadiness: readiness,
      // TASK-862 Slice C — pre-requisitos y datos extendidos en top-level del snapshot.
      // Slice D los consume para renderizar Ley 21.389 banner, reserva de derechos
      // bloque + watermark logic + logo empleador.
      maintenanceObligation: preReqs.maintenanceObligation,
      resignationLetterAssetId: preReqs.resignationLetterAssetId,
      ratification: ratification ?? null
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
  const reissueReason = input.reissue ? normalizeNullableString(input.reason) : null

  if (input.reissue && (!reissueReason || reissueReason.length < 10)) {
    throw new PayrollValidationError('Reissue reason is required and must be at least 10 characters.', 400)
  }

  const settlement = await getLatestFinalSettlementForCase(input.offboardingCaseId)

  if (!settlement) {
    throw new PayrollValidationError('Final settlement not found.', 404)
  }

  if (settlement.calculationStatus !== 'approved') {
    throw new PayrollValidationError('Only approved final settlements can render a finiquito document.', 409, {
      status: settlement.calculationStatus
    })
  }

  return withTransaction(async client => {
    const currentRows = await client.query<FinalSettlementDocumentRow>(
      `
        SELECT *
        FROM greenhouse_payroll.final_settlement_documents
        WHERE offboarding_case_id = $1
        ORDER BY document_version DESC, created_at DESC
        FOR UPDATE
      `,
      [settlement.offboardingCaseId]
    )

    const documents = currentRows.rows.map(mapDocumentRow)
    const latest = documents[0] ?? null
    const currentSettlementDocuments = documents.filter(doc => doc.finalSettlementId === settlement.finalSettlementId)
    const active = currentSettlementDocuments.find(doc => !INACTIVE_DOCUMENT_STATUSES.has(doc.documentStatus))

    if (active && !input.reissue) {
      return active
    }

    if (input.reissue && !active) {
      throw new PayrollValidationError('No active final settlement document exists for the approved settlement. Generate the current document before reissuing it.', 409, {
        finalSettlementId: settlement.finalSettlementId,
        settlementVersion: settlement.settlementVersion
      })
    }

    if (active?.documentStatus === 'signed_or_ratified') {
      throw new PayrollValidationError('Signed or ratified final settlement documents cannot be reissued. Void or create a legal remediation flow instead.', 409, {
        status: active.documentStatus
      })
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
        reason: reissueReason
      })
      await publishDocumentEvent(client, EVENT_TYPES.hrFinalSettlementDocumentSuperseded, superseded, { reason: reissueReason })
    }

    const { snapshot, readiness } = await buildDocumentSnapshot(settlement)

    if (readiness.hasBlockers) {
      throw new PayrollValidationError('Final settlement document is not ready to render.', 409, readiness)
    }

    const documentId = `final-settlement-document-${randomUUID()}`
    const snapshotHash = computeJsonSha256(snapshot)
    const pdfBytes = await renderFinalSettlementDocumentPdf(snapshot, { documentStatus: 'rendered' })
    const contentHash = computeBytesSha256(pdfBytes)
    const documentVersion = (latest?.documentVersion ?? 0) + 1
    const fileName = `finiquito-${settlement.memberId}-v${settlement.settlementVersion}-d${documentVersion}.pdf`

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
        documentVersion,
        reissue: Boolean(input.reissue),
        reissueReason,
        snapshotHash,
        contentHash
      }
    })

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
      reason: reissueReason,
      payload: { reissue: Boolean(input.reissue), supersedesDocumentId: active?.finalSettlementDocumentId ?? null, pdfAssetId: document.pdfAssetId }
    })
    await publishDocumentEvent(client, EVENT_TYPES.hrFinalSettlementDocumentRendered, document, {
      reissue: Boolean(input.reissue),
      supersedesDocumentId: active?.finalSettlementDocumentId ?? null,
      reason: reissueReason
    })

    return document
  })
}

const getCurrentApprovedSettlementForUpdate = async (client: PoolClient, offboardingCaseId: string) => {
  const settlementRows = await client.query<CurrentSettlementRow>(
    `
      SELECT final_settlement_id, calculation_status
      FROM greenhouse_payroll.final_settlements
      WHERE offboarding_case_id = $1
      ORDER BY settlement_version DESC, created_at DESC
      LIMIT 1
      FOR UPDATE
    `,
    [offboardingCaseId]
  )

  const settlement = settlementRows.rows[0] ?? null

  if (!settlement) {
    throw new PayrollValidationError('Final settlement not found.', 404)
  }

  if (settlement.calculation_status !== 'approved') {
    throw new PayrollValidationError('Only approved final settlements can operate a finiquito document.', 409, {
      status: settlement.calculation_status
    })
  }

  return settlement
}

const getCurrentDocumentForUpdate = async (client: PoolClient, offboardingCaseId: string) => {
  const settlement = await getCurrentApprovedSettlementForUpdate(client, offboardingCaseId)

  const rows = await client.query<FinalSettlementDocumentRow>(
    `
      SELECT *
      FROM greenhouse_payroll.final_settlement_documents
      WHERE final_settlement_id = $1
      ORDER BY document_version DESC, created_at DESC
      LIMIT 1
      FOR UPDATE
    `,
    [settlement.final_settlement_id]
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

/**
 * TASK-863 V1.1 — Regenera el PDF + reemplaza el asset cuando el documento
 * transita a un estado que requiere render distinto:
 *   - `issued`: watermark "PROYECTO" → CLEAN (PDF para llevar al notario)
 *   - `signed_or_ratified`: + bloque de ministro de fe + reserva worker
 *
 * Mantiene `pdf_asset_id` apuntando al nuevo asset; el viejo queda con status
 * `attached` historico (no se borra para audit trail).
 *
 * Es idempotente: si el render falla, la transition de estado ya commiteo
 * (UPDATE document_status) y el operador puede invocar reissue para recovery.
 * Esto NO es ideal pero evita rollback de un estado legal valido por error
 * transitorio de render.
 */
const regenerateDocumentPdfForStatus = async (
  client: PoolClient,
  document: FinalSettlementDocument,
  newDocumentStatus: 'issued' | 'signed_or_ratified',
  actorUserId: string,
  ratification?: FinalSettlementRatification | null
): Promise<{ pdfAssetId: string; contentHash: string } | null> => {
  try {
    // Snapshot inmutable: reuse el existente (hash matches, ya validado upstream).
    // Para signed_or_ratified, hidratamos la ratification si el caller la pasa.
    const snapshot: FinalSettlementDocumentSnapshot = ratification
      ? { ...document.snapshot, ratification }
      : document.snapshot

    const pdfBytes = await renderFinalSettlementDocumentPdf(snapshot, { documentStatus: newDocumentStatus })
    const contentHash = computeBytesSha256(pdfBytes)
    const fileName = `finiquito-${document.memberId}-v${document.settlementVersion}-d${document.documentVersion}-${newDocumentStatus}.pdf`

    const asset = await storeSystemGeneratedPrivateAsset({
      ownerAggregateType: 'final_settlement_document',
      ownerAggregateId: document.finalSettlementDocumentId,
      ownerMemberId: document.memberId,
      fileName,
      mimeType: 'application/pdf',
      bytes: pdfBytes,
      actorUserId,
      metadata: {
        finalSettlementId: document.finalSettlementId,
        offboardingCaseId: document.offboardingCaseId,
        documentVersion: document.documentVersion,
        regeneratedFor: newDocumentStatus,
        contentHash
      }
    })

    await client.query(
      `UPDATE greenhouse_payroll.final_settlement_documents
       SET pdf_asset_id = $2, content_hash = $3, updated_at = now(), updated_by_user_id = $4
       WHERE final_settlement_document_id = $1`,
      [document.finalSettlementDocumentId, asset.assetId, contentHash, actorUserId]
    )

    return { pdfAssetId: asset.assetId, contentHash }
  } catch (error) {
    // Render fail no debe abortar la transition (estado legal ya commiteado).
    // El operador puede usar reissue para recovery.
    console.warn(`[regenerateDocumentPdfForStatus] failed for status=${newDocumentStatus}:`, error instanceof Error ? error.message : error)

    return null
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

  // TASK-863 V1.1 — Regenerar PDF al transicionar a issued para que el
  // operador descargue el PDF SIN watermark "PROYECTO" para llevar al notario.
  // Idempotente: si falla el render, la transition de estado ya commiteo y
  // operador puede usar reissue para recovery.
  const regenerated = await regenerateDocumentPdfForStatus(client, document, 'issued', actorUserId)

  const issuedDocument = regenerated
    ? { ...document, pdfAssetId: regenerated.pdfAssetId, contentHash: regenerated.contentHash }
    : document

  await insertDocumentEvent(client, {
    document: issuedDocument,
    eventType: EVENT_TYPES.hrFinalSettlementDocumentIssued,
    fromStatus: current.documentStatus,
    toStatus: issuedDocument.documentStatus,
    actorUserId,
    payload: { pdfAssetId: issuedDocument.pdfAssetId, pdfRegenerated: Boolean(regenerated) }
  })
  await publishDocumentEvent(client, EVENT_TYPES.hrFinalSettlementDocumentIssued, issuedDocument)

  return issuedDocument
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

  // TASK-863 V1.1 — Regenerar PDF al transicionar a signed_or_ratified.
  // El nuevo render embebe metadata del ministro de fe + worker reservation
  // como ratification snapshot, y queda SIN watermark.
  const ratificationSnapshot: FinalSettlementRatification | null = (() => {
    const minister = (evidenceRef as Record<string, unknown>) ?? {}
    const ratifiedAt = typeof minister.ratifiedAt === 'string' ? minister.ratifiedAt : null

    if (!ratifiedAt) return null

    return {
      ministerKind: typeof minister.ministerKind === 'string' ? minister.ministerKind : null,
      ministerName: typeof minister.ministerName === 'string' ? minister.ministerName : null,
      ministerTaxId: typeof minister.ministerTaxId === 'string' ? minister.ministerTaxId : null,
      notaria: typeof minister.notaria === 'string' ? minister.notaria : null,
      ratifiedAt,
      workerReservationOfRights: document.workerReservationOfRights,
      workerReservationNotes: document.workerReservationNotes,
      signatureEvidenceAssetId: document.signatureEvidenceAssetId
    } as FinalSettlementRatification
  })()

  const regenerated = await regenerateDocumentPdfForStatus(client, document, 'signed_or_ratified', actorUserId, ratificationSnapshot)

  const ratifiedDocument = regenerated
    ? { ...document, pdfAssetId: regenerated.pdfAssetId, contentHash: regenerated.contentHash }
    : document

  await insertDocumentEvent(client, {
    document: ratifiedDocument,
    eventType: EVENT_TYPES.hrFinalSettlementDocumentSignedOrRatified,
    fromStatus: current.documentStatus,
    toStatus: ratifiedDocument.documentStatus,
    actorUserId,
    payload: {
      signatureEvidenceAssetId: ratifiedDocument.signatureEvidenceAssetId,
      hasExternalEvidenceRef: Object.keys(ratifiedDocument.signatureEvidenceRef).length > 0,
      workerReservationOfRights: ratifiedDocument.workerReservationOfRights,
      pdfRegenerated: Boolean(regenerated)
    }
  })
  await publishDocumentEvent(client, EVENT_TYPES.hrFinalSettlementDocumentSignedOrRatified, ratifiedDocument, {
    workerReservationOfRights: ratifiedDocument.workerReservationOfRights
  })

  return ratifiedDocument
})

export const getFinalSettlementDocumentDownloadUrl = (document: FinalSettlementDocument) =>
  document.pdfAssetId ? `/api/assets/private/${encodeURIComponent(document.pdfAssetId)}` : null
