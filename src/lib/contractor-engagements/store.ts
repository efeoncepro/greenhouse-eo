import 'server-only'

import { randomUUID } from 'crypto'

import type { PoolClient } from 'pg'

import { query, withGreenhousePostgresTransaction } from '@/lib/db'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  computeClassificationRisk,
  isClassificationRiskBlocking,
  shouldAutoActivateOnOnboard
} from './classification-risk'
import { ContractorEngagementValidationError } from './errors'
import { assertValidEngagementTransition, isTerminalEngagementStatus } from './state-machine'
import {
  assertSubtypeConsistency,
  normalizeRelationshipCoarseSubtype
} from './subtype-consistency'
import {
  resolveDefaultTaxComplianceOwner,
  resolveHonorariosWithholdingPolicy
} from './tax-policy'
import type {
  ContractorClassificationRiskFactors,
  ContractorEngagement,
  ContractorEngagementStatus,
  CreateContractorEngagementInput,
  ReviewContractorClassificationInput,
  TransitionContractorEngagementInput,
  UpdateContractorEngagementInput
} from './types'

// ── Row mapping ───────────────────────────────────────────────────────────

interface ContractorEngagementRow {
  contractor_engagement_id: string
  public_id: string
  profile_id: string
  member_id: string | null
  person_legal_entity_relationship_id: string
  legal_entity_organization_id: string
  country_code: string
  tax_residency_country_code: string | null
  relationship_subtype: string
  payroll_via: string
  currency: string
  payment_currency: string | null
  fx_policy_code: string | null
  provider_contract_id: string | null
  provider_worker_id: string | null
  payment_model: string
  rate_type: string
  rate_amount: string | number | null
  payment_cadence: string
  requires_invoice: boolean
  requires_work_approval: boolean
  tax_compliance_owner: string
  tax_withholding_policy_code: string | null
  tax_withholding_rate_snapshot: string | number | null
  bonus_policy: string
  classification_risk_status: string
  classification_reviewed: boolean
  classification_risk_factors: unknown
  status: string
  start_date: string | Date
  end_date: string | Date | null
  closure_reason: string | null
  closure_effective_date: string | Date | null
  provider_termination_ref: string | null
  closure_initiated_at: string | Date | null
  closure_initiated_by: string | null
  closure_executed_at: string | Date | null
  closure_executed_by: string | null
  post_closure_invoices_allowed: boolean
  metadata_json: unknown
  created_by_user_id: string | null
  created_at: string | Date
  updated_at: string | Date
  // Index signature so the row satisfies the `query<T extends Record<string, unknown>>`
  // constraint from @/lib/db. Explicit fields above are all assignable to `unknown`.
  [column: string]: unknown
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const toNullableNumber = (value: string | number | null): number | null => {
  if (value === null) return null
  const n = typeof value === 'number' ? value : Number(value)

  
return Number.isFinite(n) ? n : null
}

const toDateString = (value: string | Date): string =>
  value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)

const toNullableDateString = (value: string | Date | null): string | null =>
  value === null ? null : toDateString(value)

const toTimestamp = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : String(value)

const toNullableTimestamp = (value: string | Date | null): string | null =>
  value === null ? null : toTimestamp(value)

export const mapContractorEngagement = (row: ContractorEngagementRow): ContractorEngagement => ({
  contractorEngagementId: row.contractor_engagement_id,
  publicId: row.public_id,
  profileId: row.profile_id,
  memberId: row.member_id,
  personLegalEntityRelationshipId: row.person_legal_entity_relationship_id,
  legalEntityOrganizationId: row.legal_entity_organization_id,
  countryCode: row.country_code,
  taxResidencyCountryCode: row.tax_residency_country_code,
  relationshipSubtype: row.relationship_subtype as ContractorEngagement['relationshipSubtype'],
  payrollVia: row.payroll_via as ContractorEngagement['payrollVia'],
  currency: row.currency,
  paymentCurrency: row.payment_currency,
  fxPolicyCode: row.fx_policy_code,
  providerContractId: row.provider_contract_id,
  providerWorkerId: row.provider_worker_id,
  paymentModel: row.payment_model as ContractorEngagement['paymentModel'],
  rateType: row.rate_type as ContractorEngagement['rateType'],
  rateAmount: toNullableNumber(row.rate_amount),
  paymentCadence: row.payment_cadence as ContractorEngagement['paymentCadence'],
  requiresInvoice: row.requires_invoice,
  requiresWorkApproval: row.requires_work_approval,
  taxComplianceOwner: row.tax_compliance_owner as ContractorEngagement['taxComplianceOwner'],
  taxWithholdingPolicyCode: row.tax_withholding_policy_code,
  taxWithholdingRateSnapshot: toNullableNumber(row.tax_withholding_rate_snapshot),
  bonusPolicy: row.bonus_policy as ContractorEngagement['bonusPolicy'],
  classificationRiskStatus:
    row.classification_risk_status as ContractorEngagement['classificationRiskStatus'],
  classificationReviewed: row.classification_reviewed,
  classificationRiskFactors: toRecord(
    row.classification_risk_factors
  ) as ContractorClassificationRiskFactors,
  status: row.status as ContractorEngagementStatus,
  startDate: toDateString(row.start_date),
  endDate: toNullableDateString(row.end_date),
  closureReason: row.closure_reason,
  closureEffectiveDate: toNullableDateString(row.closure_effective_date),
  providerTerminationRef: row.provider_termination_ref,
  closureInitiatedAt: toNullableTimestamp(row.closure_initiated_at),
  closureInitiatedBy: row.closure_initiated_by,
  closureExecutedAt: toNullableTimestamp(row.closure_executed_at),
  closureExecutedBy: row.closure_executed_by,
  postClosureInvoicesAllowed: row.post_closure_invoices_allowed,
  metadata: toRecord(row.metadata_json),
  createdByUserId: row.created_by_user_id,
  createdAt: toTimestamp(row.created_at),
  updatedAt: toTimestamp(row.updated_at)
})

const SELECT_COLUMNS = `
  contractor_engagement_id, public_id, profile_id, member_id,
  person_legal_entity_relationship_id, legal_entity_organization_id, country_code,
  tax_residency_country_code, relationship_subtype, payroll_via, currency,
  payment_currency, fx_policy_code, provider_contract_id, provider_worker_id,
  payment_model, rate_type, rate_amount, payment_cadence, requires_invoice,
  requires_work_approval, tax_compliance_owner, tax_withholding_policy_code,
  tax_withholding_rate_snapshot, bonus_policy, classification_risk_status,
  classification_reviewed, classification_risk_factors, status, start_date,
  end_date, closure_reason, closure_effective_date, provider_termination_ref,
  closure_initiated_at, closure_initiated_by, closure_executed_at,
  closure_executed_by, post_closure_invoices_allowed,
  metadata_json, created_by_user_id, created_at, updated_at
`

/** Re-export for sibling stores (e.g. closure) that lock + map engagement rows. */
export { SELECT_COLUMNS as CONTRACTOR_ENGAGEMENT_SELECT_COLUMNS }

// ── Readers ─────────────────────────────────────────────────────────────────

export const getContractorEngagementById = async (
  contractorEngagementId: string
): Promise<ContractorEngagement | null> => {
  const rows = await query<ContractorEngagementRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM greenhouse_hr.contractor_engagements
     WHERE contractor_engagement_id = $1`,
    [contractorEngagementId]
  )

  return rows[0] ? mapContractorEngagement(rows[0]) : null
}

export const listContractorEngagementsByProfile = async (
  profileId: string
): Promise<ContractorEngagement[]> => {
  const rows = await query<ContractorEngagementRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM greenhouse_hr.contractor_engagements
     WHERE profile_id = $1
     ORDER BY start_date DESC, created_at DESC`,
    [profileId]
  )

  return rows.map(mapContractorEngagement)
}

export const listContractorEngagementsByRelationship = async (
  personLegalEntityRelationshipId: string
): Promise<ContractorEngagement[]> => {
  const rows = await query<ContractorEngagementRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM greenhouse_hr.contractor_engagements
     WHERE person_legal_entity_relationship_id = $1
     ORDER BY start_date DESC, created_at DESC`,
    [personLegalEntityRelationshipId]
  )

  return rows.map(mapContractorEngagement)
}

export interface ListContractorEngagementsFilters {
  status?: ContractorEngagementStatus
  classificationRiskStatus?: ContractorEngagement['classificationRiskStatus']
  /** Only engagements without an agreed rate (rate_amount IS NULL) — TASK-968. */
  missingRate?: boolean
  /** Exclude terminal engagements (ended/cancelled). */
  excludeTerminal?: boolean
  limit?: number
  offset?: number
}

export const listContractorEngagements = async (
  filters: ListContractorEngagementsFilters = {}
): Promise<ContractorEngagement[]> => {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters.status) {
    params.push(filters.status)
    conditions.push(`status = $${params.length}`)
  }

  if (filters.classificationRiskStatus) {
    params.push(filters.classificationRiskStatus)
    conditions.push(`classification_risk_status = $${params.length}`)
  }

  if (filters.missingRate) {
    conditions.push(`rate_amount IS NULL`)
  }

  if (filters.excludeTerminal) {
    conditions.push(`status NOT IN ('ended', 'cancelled')`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = Math.min(200, Math.max(1, filters.limit ?? 50))
  const offset = Math.max(0, filters.offset ?? 0)

  params.push(limit)
  params.push(offset)

  const rows = await query<ContractorEngagementRow>(
    `SELECT ${SELECT_COLUMNS}
     FROM greenhouse_hr.contractor_engagements
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  return rows.map(mapContractorEngagement)
}

// ── Internal helpers ──────────────────────────────────────────────────────────

interface AnchorRelationshipRow {
  relationship_id: string
  profile_id: string
  relationship_type: string
  status: string
  effective_to: string | Date | null
  metadata_json: unknown
}

const loadActiveContractorAnchor = async (
  client: PoolClient,
  relationshipId: string,
  expectedProfileId: string
): Promise<AnchorRelationshipRow> => {
  const result = await client.query<AnchorRelationshipRow>(
    `SELECT relationship_id, profile_id, relationship_type, status, effective_to, metadata_json
     FROM greenhouse_core.person_legal_entity_relationships
     WHERE relationship_id = $1`,
    [relationshipId]
  )

  const row = result.rows[0]

  if (!row) {
    throw new ContractorEngagementValidationError(
      'La relación legal anclada no existe.',
      'anchor_relationship_not_found',
      404
    )
  }

  if (row.relationship_type !== 'contractor') {
    throw new ContractorEngagementValidationError(
      'El engagement solo puede anclarse a una relación de tipo contractor.',
      'anchor_relationship_not_contractor',
      409
    )
  }

  if (row.status !== 'active' || row.effective_to !== null) {
    throw new ContractorEngagementValidationError(
      'La relación contractor anclada no está activa.',
      'anchor_relationship_not_active',
      409
    )
  }

  if (row.profile_id !== expectedProfileId) {
    throw new ContractorEngagementValidationError(
      'El profile del engagement no coincide con el de la relación anclada.',
      'anchor_relationship_profile_mismatch',
      409
    )
  }

  return row
}

export const appendEngagementEvent = async (
  client: PoolClient,
  params: {
    contractorEngagementId: string
    eventType:
      | 'created'
      | 'updated'
      | 'status_changed'
      | 'classification_reviewed'
      | 'classification_risk_flagged'
    fromStatus?: string | null
    toStatus?: string | null
    fromClassificationRiskStatus?: string | null
    toClassificationRiskStatus?: string | null
    actorUserId: string
    reason?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<void> => {
  await client.query(
    `INSERT INTO greenhouse_hr.contractor_engagement_events (
       event_id, contractor_engagement_id, event_type, from_status, to_status,
       from_classification_risk_status, to_classification_risk_status,
       actor_user_id, reason, metadata_json
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
    [
      `cenge-${randomUUID()}`,
      params.contractorEngagementId,
      params.eventType,
      params.fromStatus ?? null,
      params.toStatus ?? null,
      params.fromClassificationRiskStatus ?? null,
      params.toClassificationRiskStatus ?? null,
      params.actorUserId,
      params.reason ?? null,
      JSON.stringify(params.metadata ?? {})
    ]
  )
}

export const publishEngagementEvent = async (
  client: PoolClient,
  engagement: ContractorEngagement,
  eventType: string,
  extra: Record<string, unknown> = {}
): Promise<void> => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.contractorEngagement,
      aggregateId: engagement.contractorEngagementId,
      eventType,
      payload: {
        schemaVersion: 1,
        contractorEngagementId: engagement.contractorEngagementId,
        publicId: engagement.publicId,
        profileId: engagement.profileId,
        memberId: engagement.memberId,
        personLegalEntityRelationshipId: engagement.personLegalEntityRelationshipId,
        legalEntityOrganizationId: engagement.legalEntityOrganizationId,
        relationshipSubtype: engagement.relationshipSubtype,
        payrollVia: engagement.payrollVia,
        paymentModel: engagement.paymentModel,
        status: engagement.status,
        classificationRiskStatus: engagement.classificationRiskStatus,
        ...extra
      }
    },
    client
  )
}

/**
 * TASK-985 — Onboarding auto-activation. Si el engagement está en `draft` y su
 * clasificación NO es bloqueante, lo activa (`draft → active`) dentro del
 * client/tx dado (append `status_changed` + outbox `contractorEngagementActivated`).
 * No-op si ya salió de `draft` o si el riesgo es bloqueante (queda retenido para
 * revisión legal). Idempotente + reusable por el onboarding A/B + el heal del
 * `already_complete`.
 */
export const activateEngagementIfNotBlocking = async (
  client: PoolClient,
  engagement: ContractorEngagement,
  actorUserId: string
): Promise<ContractorEngagement> => {
  if (engagement.status !== 'draft' || !shouldAutoActivateOnOnboard(engagement.classificationRiskStatus)) {
    return engagement
  }

  assertValidEngagementTransition('draft', 'active')

  const result = await client.query<ContractorEngagementRow>(
    `UPDATE greenhouse_hr.contractor_engagements
     SET status = 'active'
     WHERE contractor_engagement_id = $1
     RETURNING ${SELECT_COLUMNS}`,
    [engagement.contractorEngagementId]
  )

  const updated = mapContractorEngagement(result.rows[0])

  await appendEngagementEvent(client, {
    contractorEngagementId: updated.contractorEngagementId,
    eventType: 'status_changed',
    fromStatus: 'draft',
    toStatus: 'active',
    actorUserId,
    reason: 'onboarding_auto_activation',
    metadata: {
      lifecycle: 'onboarding_auto_activated',
      classificationRiskStatus: updated.classificationRiskStatus
    }
  })

  await publishEngagementEvent(client, updated, EVENT_TYPES.contractorEngagementActivated, {
    fromStatus: 'draft',
    reason: 'onboarding_auto_activation'
  })

  return updated
}

// ── Commands ──────────────────────────────────────────────────────────────────

const runCreateContractorEngagement = async (
  client: PoolClient,
  input: CreateContractorEngagementInput
): Promise<ContractorEngagement> => {
    const anchor = await loadActiveContractorAnchor(
      client,
      input.personLegalEntityRelationshipId,
      input.profileId
    )

    // D2: family consistency between engagement fine subtype and relationship coarse subtype.
    const coarse = normalizeRelationshipCoarseSubtype(
      toRecord(anchor.metadata_json).relationshipSubtype
    )

    assertSubtypeConsistency(coarse, input.relationshipSubtype)

    const taxComplianceOwner =
      input.taxComplianceOwner ??
      resolveDefaultTaxComplianceOwner({
        relationshipSubtype: input.relationshipSubtype,
        payrollVia: input.payrollVia
      })

    // Chile honorarios: snapshot SII withholding policy at the engagement start year.
    let taxWithholdingPolicyCode: string | null = null
    let taxWithholdingRateSnapshot: number | null = null

    if (input.relationshipSubtype === 'honorarios_cl') {
      const emissionYear = Number(input.startDate.slice(0, 4))
      const policy = resolveHonorariosWithholdingPolicy(emissionYear)

      taxWithholdingPolicyCode = policy.policyCode
      taxWithholdingRateSnapshot = policy.rateSnapshot
    }

    const classificationRiskFactors = input.classificationRiskFactors ?? {}

    // Fresh engagement is never auto-cleared (reviewed=false).
    const classificationRiskStatus = computeClassificationRisk({
      factors: classificationRiskFactors,
      reviewed: false
    })

    const result = await client.query<ContractorEngagementRow>(
      `INSERT INTO greenhouse_hr.contractor_engagements (
         contractor_engagement_id, public_id, profile_id, member_id,
         person_legal_entity_relationship_id, legal_entity_organization_id, country_code,
         tax_residency_country_code, relationship_subtype, payroll_via, currency,
         payment_currency, fx_policy_code, provider_contract_id, provider_worker_id,
         payment_model, rate_type, rate_amount, payment_cadence, requires_invoice,
         requires_work_approval, tax_compliance_owner, tax_withholding_policy_code,
         tax_withholding_rate_snapshot, bonus_policy, classification_risk_status,
         classification_reviewed, classification_risk_factors, status, start_date,
         end_date, metadata_json, created_by_user_id
       ) VALUES (
         $1,
         'EO-CENG-' || LPAD(nextval('greenhouse_hr.seq_contractor_engagement_public_id')::text, 4, '0'),
         $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
         $19, $20, $21, $22, $23, $24, $25, $26, $27::jsonb, 'draft', $28::date, $29::date,
         $30::jsonb, $31
       )
       RETURNING ${SELECT_COLUMNS}`,
      [
        `ceng-${randomUUID()}`,
        input.profileId,
        input.memberId ?? null,
        input.personLegalEntityRelationshipId,
        input.legalEntityOrganizationId,
        input.countryCode,
        input.taxResidencyCountryCode ?? null,
        input.relationshipSubtype,
        input.payrollVia,
        input.currency,
        input.paymentCurrency ?? null,
        input.fxPolicyCode ?? null,
        input.providerContractId ?? null,
        input.providerWorkerId ?? null,
        input.paymentModel,
        input.rateType,
        input.rateAmount ?? null,
        input.paymentCadence,
        input.requiresInvoice ?? true,
        input.requiresWorkApproval ?? true,
        taxComplianceOwner,
        taxWithholdingPolicyCode,
        taxWithholdingRateSnapshot,
        input.bonusPolicy ?? 'none',
        classificationRiskStatus,
        // TASK-956 fix: classification_reviewed ($26) value was missing from the
        // params array (pre-existing TASK-790 latent bug — no engagement was ever
        // created in dev so the "30 params vs 31 placeholders" error never surfaced
        // until the first real insert via transitionEmployeeToContractorEngagement).
        // A fresh engagement is never auto-reviewed (computeClassificationRisk above
        // is called with reviewed:false), so classification_reviewed is always false here.
        false,
        JSON.stringify(classificationRiskFactors),
        input.startDate,
        input.endDate ?? null,
        JSON.stringify(input.metadata ?? {}),
        input.actorUserId
      ]
    )

    const engagement = mapContractorEngagement(result.rows[0])

    await appendEngagementEvent(client, {
      contractorEngagementId: engagement.contractorEngagementId,
      eventType: 'created',
      toStatus: engagement.status,
      toClassificationRiskStatus: engagement.classificationRiskStatus,
      actorUserId: input.actorUserId,
      metadata: { relationshipSubtype: engagement.relationshipSubtype }
    })

    await publishEngagementEvent(client, engagement, EVENT_TYPES.contractorEngagementCreated)

    if (isClassificationRiskBlocking(engagement.classificationRiskStatus)) {
      await publishEngagementEvent(
        client,
        engagement,
        EVENT_TYPES.contractorEngagementClassificationRiskFlagged,
        { classificationRiskFactors: engagement.classificationRiskFactors }
      )
    }

    // TASK-985 — Onboarding opt-in: auto-activar si la clasificación no es
    // bloqueante. Riesgo bloqueante ya emitió el flag arriba y queda en `draft`.
    if (input.activateWhenClassificationNotBlocking) {
      return activateEngagementIfNotBlocking(client, engagement, input.actorUserId)
    }

    return engagement
}

/**
 * Creates a contractor engagement anchored to an already-active contractor
 * relationship.
 *
 * Dual-mode (TASK-765/771/872 pattern): pass an existing `client` to run inside
 * a caller-owned transaction (e.g. the connected employee→contractor-engagement
 * command, where the contractor relationship is created in the SAME tx and is
 * therefore visible to `loadActiveContractorAnchor`). Omitting `client` wraps
 * the work in its own transaction. Behavior + return shape are identical.
 */
export const createContractorEngagement = async (
  input: CreateContractorEngagementInput,
  client?: PoolClient
): Promise<ContractorEngagement> => {
  if (client) {
    return runCreateContractorEngagement(client, input)
  }

  return withGreenhousePostgresTransaction((c) => runCreateContractorEngagement(c, input))
}

const LIFECYCLE_EVENT_BY_STATUS: Partial<Record<ContractorEngagementStatus, string>> = {
  active: EVENT_TYPES.contractorEngagementActivated,
  paused: EVENT_TYPES.contractorEngagementPaused,
  ended: EVENT_TYPES.contractorEngagementEnded,
  cancelled: EVENT_TYPES.contractorEngagementCancelled
}

export const transitionContractorEngagement = async (
  input: TransitionContractorEngagementInput
): Promise<ContractorEngagement> =>
  withGreenhousePostgresTransaction(async (client) => {
    const lockResult = await client.query<ContractorEngagementRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM greenhouse_hr.contractor_engagements
       WHERE contractor_engagement_id = $1
       FOR UPDATE`,
      [input.contractorEngagementId]
    )

    const current = lockResult.rows[0] ? mapContractorEngagement(lockResult.rows[0]) : null

    if (!current) {
      throw new ContractorEngagementValidationError(
        'El engagement no existe.',
        'engagement_not_found',
        404
      )
    }

    // Idempotent: no-op when already in the target state.
    if (current.status === input.targetStatus) {
      return current
    }

    assertValidEngagementTransition(current.status, input.targetStatus)

    // Risk gate (app layer; the DB CHECK is the last line of defense).
    if (
      input.targetStatus === 'active' &&
      isClassificationRiskBlocking(current.classificationRiskStatus)
    ) {
      throw new ContractorEngagementValidationError(
        'No se puede activar un engagement con riesgo de clasificación bloqueante. Resuelve la revisión legal primero.',
        'engagement_blocked_by_classification_risk',
        409
      )
    }

    const result = await client.query<ContractorEngagementRow>(
      `UPDATE greenhouse_hr.contractor_engagements
       SET status = $2
       WHERE contractor_engagement_id = $1
       RETURNING ${SELECT_COLUMNS}`,
      [input.contractorEngagementId, input.targetStatus]
    )

    const updated = mapContractorEngagement(result.rows[0])

    await appendEngagementEvent(client, {
      contractorEngagementId: updated.contractorEngagementId,
      eventType: 'status_changed',
      fromStatus: current.status,
      toStatus: updated.status,
      actorUserId: input.actorUserId,
      reason: input.reason ?? null
    })

    const lifecycleEvent = LIFECYCLE_EVENT_BY_STATUS[updated.status]

    if (lifecycleEvent) {
      await publishEngagementEvent(client, updated, lifecycleEvent, {
        fromStatus: current.status
      })
    }

    return updated
  })

export const updateContractorEngagement = async (
  input: UpdateContractorEngagementInput
): Promise<ContractorEngagement> =>
  withGreenhousePostgresTransaction(async (client) => {
    const lockResult = await client.query<ContractorEngagementRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM greenhouse_hr.contractor_engagements
       WHERE contractor_engagement_id = $1
       FOR UPDATE`,
      [input.contractorEngagementId]
    )

    const current = lockResult.rows[0] ? mapContractorEngagement(lockResult.rows[0]) : null

    if (!current) {
      throw new ContractorEngagementValidationError(
        'El engagement no existe.',
        'engagement_not_found',
        404
      )
    }

    if (isTerminalEngagementStatus(current.status)) {
      throw new ContractorEngagementValidationError(
        'No se puede editar un engagement en estado terminal.',
        'engagement_terminal_immutable',
        409
      )
    }

    const sets: string[] = []
    const params: unknown[] = [input.contractorEngagementId]

    const push = (column: string, value: unknown) => {
      params.push(value)
      sets.push(`${column} = $${params.length}`)
    }

    if (input.paymentModel !== undefined) push('payment_model', input.paymentModel)
    if (input.rateType !== undefined) push('rate_type', input.rateType)
    if (input.rateAmount !== undefined) push('rate_amount', input.rateAmount)
    if (input.paymentCadence !== undefined) push('payment_cadence', input.paymentCadence)
    if (input.paymentCurrency !== undefined) push('payment_currency', input.paymentCurrency)
    if (input.fxPolicyCode !== undefined) push('fx_policy_code', input.fxPolicyCode)
    if (input.providerContractId !== undefined)
      push('provider_contract_id', input.providerContractId)
    if (input.providerWorkerId !== undefined) push('provider_worker_id', input.providerWorkerId)
    if (input.requiresInvoice !== undefined) push('requires_invoice', input.requiresInvoice)
    if (input.requiresWorkApproval !== undefined)
      push('requires_work_approval', input.requiresWorkApproval)
    if (input.bonusPolicy !== undefined) push('bonus_policy', input.bonusPolicy)
    if (input.endDate !== undefined) push('end_date', input.endDate)

    if (input.metadataPatch !== undefined) {
      params.push(JSON.stringify(input.metadataPatch))
      sets.push(`metadata_json = metadata_json || $${params.length}::jsonb`)
    }

    if (sets.length === 0) {
      return current
    }

    const result = await client.query<ContractorEngagementRow>(
      `UPDATE greenhouse_hr.contractor_engagements
       SET ${sets.join(', ')}
       WHERE contractor_engagement_id = $1
       RETURNING ${SELECT_COLUMNS}`,
      params
    )

    const updated = mapContractorEngagement(result.rows[0])

    await appendEngagementEvent(client, {
      contractorEngagementId: updated.contractorEngagementId,
      eventType: 'updated',
      actorUserId: input.actorUserId
    })

    return updated
  })

export const reviewContractorClassification = async (
  input: ReviewContractorClassificationInput
): Promise<ContractorEngagement> =>
  withGreenhousePostgresTransaction(async (client) => {
    const lockResult = await client.query<ContractorEngagementRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM greenhouse_hr.contractor_engagements
       WHERE contractor_engagement_id = $1
       FOR UPDATE`,
      [input.contractorEngagementId]
    )

    const current = lockResult.rows[0] ? mapContractorEngagement(lockResult.rows[0]) : null

    if (!current) {
      throw new ContractorEngagementValidationError(
        'El engagement no existe.',
        'engagement_not_found',
        404
      )
    }

    const nextRisk = computeClassificationRisk({
      factors: input.factors,
      reviewed: input.reviewed,
      block: input.block
    })

    // If an ACTIVE engagement escalates to blocking risk, auto-pause it so the
    // DB risk-gate CHECK is satisfied and the contractor is taken off active.
    const autoPause = current.status === 'active' && isClassificationRiskBlocking(nextRisk)
    const nextStatus: ContractorEngagementStatus = autoPause ? 'paused' : current.status

    const result = await client.query<ContractorEngagementRow>(
      `UPDATE greenhouse_hr.contractor_engagements
       SET classification_risk_status = $2,
           classification_reviewed = $3,
           classification_risk_factors = $4::jsonb,
           status = $5
       WHERE contractor_engagement_id = $1
       RETURNING ${SELECT_COLUMNS}`,
      [
        input.contractorEngagementId,
        nextRisk,
        input.reviewed,
        JSON.stringify(input.factors),
        nextStatus
      ]
    )

    const updated = mapContractorEngagement(result.rows[0])

    await appendEngagementEvent(client, {
      contractorEngagementId: updated.contractorEngagementId,
      eventType: 'classification_reviewed',
      fromStatus: current.status,
      toStatus: updated.status,
      fromClassificationRiskStatus: current.classificationRiskStatus,
      toClassificationRiskStatus: updated.classificationRiskStatus,
      actorUserId: input.actorUserId,
      reason: input.reason ?? null
    })

    if (
      isClassificationRiskBlocking(updated.classificationRiskStatus) &&
      !isClassificationRiskBlocking(current.classificationRiskStatus)
    ) {
      await appendEngagementEvent(client, {
        contractorEngagementId: updated.contractorEngagementId,
        eventType: 'classification_risk_flagged',
        toClassificationRiskStatus: updated.classificationRiskStatus,
        actorUserId: input.actorUserId
      })

      await publishEngagementEvent(
        client,
        updated,
        EVENT_TYPES.contractorEngagementClassificationRiskFlagged,
        { classificationRiskFactors: updated.classificationRiskFactors }
      )
    }

    if (autoPause) {
      await publishEngagementEvent(client, updated, EVENT_TYPES.contractorEngagementPaused, {
        reason: 'classification_risk_escalation'
      })
    }

    return updated
  })
