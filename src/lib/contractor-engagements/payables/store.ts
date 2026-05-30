import 'server-only'

import { randomUUID } from 'crypto'

import type { PoolClient } from 'pg'

import { query, withGreenhousePostgresTransaction } from '@/lib/db'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { ContractorEngagementValidationError } from '../errors'
import { getContractorEngagementById } from '../store'

import { computeContractorWithholding } from './withholding'
import type {
  ContractorPayable,
  ContractorPayableStatus,
  CreateContractorPayableFromSubmissionInput,
  CreateContractorPayableOffCycleInput
} from './types'

interface ContractorPayableRow {
  contractor_payable_id: string
  public_id: string
  contractor_engagement_id: string
  contractor_work_submission_id: string | null
  contractor_invoice_id: string | null
  payable_source_kind: string
  beneficiary_type: string
  beneficiary_id: string
  gross_amount: string | number
  withholding_amount: string | number
  net_payable: string | number
  currency: string
  payment_currency: string | null
  fx_policy_code: string | null
  tax_compliance_owner: string
  tax_withholding_policy_code: string | null
  economic_category: string
  payroll_via: string
  payment_profile_id: string | null
  payment_profile_waiver_reason: string | null
  due_date: string | Date | null
  status: string
  finance_obligation_id: string | null
  payment_order_id: string | null
  readiness_json: unknown
  source_snapshot_json: unknown
  created_by_user_id: string | null
  created_at: string | Date
  updated_at: string | Date
  [column: string]: unknown
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const toNumber = (value: string | number): number => {
  const n = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(n) ? n : 0
}

const toDateString = (value: string | Date | null): string | null => {
  if (value === null) return null

  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
}

const toTimestamp = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : String(value)

export const mapContractorPayable = (row: ContractorPayableRow): ContractorPayable => ({
  contractorPayableId: row.contractor_payable_id,
  publicId: row.public_id,
  contractorEngagementId: row.contractor_engagement_id,
  contractorWorkSubmissionId: row.contractor_work_submission_id,
  contractorInvoiceId: row.contractor_invoice_id,
  payableSourceKind: row.payable_source_kind as ContractorPayable['payableSourceKind'],
  beneficiaryType: row.beneficiary_type as ContractorPayable['beneficiaryType'],
  beneficiaryId: row.beneficiary_id,
  grossAmount: toNumber(row.gross_amount),
  withholdingAmount: toNumber(row.withholding_amount),
  netPayable: toNumber(row.net_payable),
  currency: row.currency,
  paymentCurrency: row.payment_currency,
  fxPolicyCode: row.fx_policy_code,
  taxComplianceOwner: row.tax_compliance_owner,
  taxWithholdingPolicyCode: row.tax_withholding_policy_code,
  economicCategory: row.economic_category,
  payrollVia: row.payroll_via,
  paymentProfileId: row.payment_profile_id,
  paymentProfileWaiverReason: row.payment_profile_waiver_reason,
  dueDate: toDateString(row.due_date),
  status: row.status as ContractorPayableStatus,
  financeObligationId: row.finance_obligation_id,
  paymentOrderId: row.payment_order_id,
  readiness: toRecord(row.readiness_json),
  sourceSnapshot: toRecord(row.source_snapshot_json),
  createdByUserId: row.created_by_user_id,
  createdAt: toTimestamp(row.created_at),
  updatedAt: toTimestamp(row.updated_at)
})

export const PAYABLE_SELECT_COLUMNS = `
  contractor_payable_id, public_id, contractor_engagement_id, contractor_work_submission_id,
  contractor_invoice_id, payable_source_kind, beneficiary_type, beneficiary_id, gross_amount,
  withholding_amount, net_payable, currency, payment_currency, fx_policy_code,
  tax_compliance_owner, tax_withholding_policy_code, economic_category, payroll_via,
  payment_profile_id, payment_profile_waiver_reason, due_date, status, finance_obligation_id,
  payment_order_id, readiness_json, source_snapshot_json, created_by_user_id, created_at, updated_at
`

// ── Readers ─────────────────────────────────────────────────────────────────

export const getContractorPayableById = async (
  contractorPayableId: string
): Promise<ContractorPayable | null> => {
  const rows = await query<ContractorPayableRow>(
    `SELECT ${PAYABLE_SELECT_COLUMNS}
     FROM greenhouse_hr.contractor_payables
     WHERE contractor_payable_id = $1`,
    [contractorPayableId]
  )

  return rows[0] ? mapContractorPayable(rows[0]) : null
}

export const listContractorPayablesByEngagement = async (
  contractorEngagementId: string
): Promise<ContractorPayable[]> => {
  const rows = await query<ContractorPayableRow>(
    `SELECT ${PAYABLE_SELECT_COLUMNS}
     FROM greenhouse_hr.contractor_payables
     WHERE contractor_engagement_id = $1
     ORDER BY created_at DESC`,
    [contractorEngagementId]
  )

  return rows.map(mapContractorPayable)
}

export interface ListContractorPayablesFilters {
  contractorEngagementId?: string
  status?: ContractorPayableStatus
  limit?: number
  offset?: number
}

export const listContractorPayables = async (
  filters: ListContractorPayablesFilters = {}
): Promise<ContractorPayable[]> => {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filters.contractorEngagementId) {
    params.push(filters.contractorEngagementId)
    conditions.push(`contractor_engagement_id = $${params.length}`)
  }

  if (filters.status) {
    params.push(filters.status)
    conditions.push(`status = $${params.length}`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = Math.min(200, Math.max(1, filters.limit ?? 50))
  const offset = Math.max(0, filters.offset ?? 0)

  params.push(limit)
  params.push(offset)

  const rows = await query<ContractorPayableRow>(
    `SELECT ${PAYABLE_SELECT_COLUMNS}
     FROM greenhouse_hr.contractor_payables
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  return rows.map(mapContractorPayable)
}

// ── Internal helpers ──────────────────────────────────────────────────────────

export const appendPayableEvent = async (
  client: PoolClient,
  params: {
    contractorPayableId: string
    eventType: 'created' | 'ready_for_finance' | 'obligation_created' | 'blocked' | 'cancelled' | 'updated'
    fromStatus?: string | null
    toStatus?: string | null
    actorUserId: string
    reason?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<void> => {
  await client.query(
    `INSERT INTO greenhouse_hr.contractor_payable_events (
       event_id, contractor_payable_id, event_type, from_status, to_status,
       actor_user_id, reason, metadata_json
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
    [
      `cpe-${randomUUID()}`,
      params.contractorPayableId,
      params.eventType,
      params.fromStatus ?? null,
      params.toStatus ?? null,
      params.actorUserId,
      params.reason ?? null,
      JSON.stringify(params.metadata ?? {})
    ]
  )
}

export const publishPayableEvent = async (
  client: PoolClient,
  payable: ContractorPayable,
  eventType: string,
  extra: Record<string, unknown> = {}
): Promise<void> => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.contractorPayable,
      aggregateId: payable.contractorPayableId,
      eventType,
      payload: {
        schemaVersion: 1,
        contractorPayableId: payable.contractorPayableId,
        publicId: payable.publicId,
        contractorEngagementId: payable.contractorEngagementId,
        beneficiaryType: payable.beneficiaryType,
        beneficiaryId: payable.beneficiaryId,
        netPayable: payable.netPayable,
        currency: payable.currency,
        status: payable.status,
        ...extra
      }
    },
    client
  )
}

const insertPayable = async (
  client: PoolClient,
  values: {
    contractorEngagementId: string
    contractorWorkSubmissionId: string | null
    payableSourceKind: string
    beneficiaryType: string
    beneficiaryId: string
    grossAmount: number
    withholdingAmount: number
    netPayable: number
    currency: string
    paymentCurrency: string | null
    fxPolicyCode: string | null
    taxComplianceOwner: string
    taxWithholdingPolicyCode: string | null
    payrollVia: string
    paymentProfileId: string | null
    dueDate: string | null
    sourceSnapshot: Record<string, unknown>
    actorUserId: string
  }
): Promise<ContractorPayable> => {
  const result = await client.query<ContractorPayableRow>(
    `INSERT INTO greenhouse_hr.contractor_payables (
       contractor_payable_id, public_id, contractor_engagement_id, contractor_work_submission_id,
       payable_source_kind, beneficiary_type, beneficiary_id, gross_amount, withholding_amount,
       net_payable, currency, payment_currency, fx_policy_code, tax_compliance_owner,
       tax_withholding_policy_code, payroll_via, payment_profile_id, due_date, status,
       source_snapshot_json, created_by_user_id
     ) VALUES (
       $1,
       'EO-CPAY-' || LPAD(nextval('greenhouse_hr.seq_contractor_payable_public_id')::text, 4, '0'),
       $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::date,
       'pending_readiness', $18::jsonb, $19
     )
     RETURNING ${PAYABLE_SELECT_COLUMNS}`,
    [
      `cpay-${randomUUID()}`,
      values.contractorEngagementId,
      values.contractorWorkSubmissionId,
      values.payableSourceKind,
      values.beneficiaryType,
      values.beneficiaryId,
      values.grossAmount,
      values.withholdingAmount,
      values.netPayable,
      values.currency,
      values.paymentCurrency,
      values.fxPolicyCode,
      values.taxComplianceOwner,
      values.taxWithholdingPolicyCode,
      values.payrollVia,
      values.paymentProfileId,
      values.dueDate,
      JSON.stringify(values.sourceSnapshot),
      values.actorUserId
    ]
  )

  return mapContractorPayable(result.rows[0])
}

// ── Commands ──────────────────────────────────────────────────────────────────

/**
 * Create a payable from an approved work submission. Marks the submission
 * consumed in the SAME transaction (dup-guard: DB UNIQUE index + the
 * approved+unconsumed lock here). Mirrors `markContractorWorkSubmissionConsumed`
 * inline so both writes are atomic.
 */
export const createContractorPayableFromSubmission = async (
  input: CreateContractorPayableFromSubmissionInput
): Promise<ContractorPayable> =>
  withGreenhousePostgresTransaction(async (client) => {
    const submissionResult = await client.query<{
      contractor_work_submission_id: string
      contractor_engagement_id: string
      status: string
      gross_amount: string | number | null
      currency: string | null
      consumed_by_payable_id: string | null
    }>(
      `SELECT contractor_work_submission_id, contractor_engagement_id, status,
              gross_amount, currency, consumed_by_payable_id
       FROM greenhouse_hr.contractor_work_submissions
       WHERE contractor_work_submission_id = $1
       FOR UPDATE`,
      [input.contractorWorkSubmissionId]
    )

    const submission = submissionResult.rows[0]

    if (!submission) {
      throw new ContractorEngagementValidationError(
        'La work submission no existe.',
        'work_submission_not_found',
        404
      )
    }

    if (submission.status !== 'approved') {
      throw new ContractorEngagementValidationError(
        'Solo una work submission aprobada puede generar un payable.',
        'work_submission_not_approved',
        409
      )
    }

    if (submission.consumed_by_payable_id !== null) {
      throw new ContractorEngagementValidationError(
        'La work submission ya fue consumida por otro payable.',
        'work_submission_already_consumed',
        409
      )
    }

    const grossAmount = submission.gross_amount === null ? 0 : toNumber(submission.gross_amount)

    if (grossAmount <= 0) {
      throw new ContractorEngagementValidationError(
        'La work submission no tiene monto bruto válido.',
        'work_submission_missing_gross',
        409
      )
    }

    const engagement = await getContractorEngagementById(submission.contractor_engagement_id)

    if (!engagement) {
      throw new ContractorEngagementValidationError(
        'El engagement contractor no existe.',
        'engagement_not_found',
        404
      )
    }

    const withholdingAmount = computeContractorWithholding({
      relationshipSubtype: engagement.relationshipSubtype,
      taxComplianceOwner: engagement.taxComplianceOwner,
      taxWithholdingRateSnapshot: engagement.taxWithholdingRateSnapshot,
      grossAmount
    })

    const netPayable = Math.round((grossAmount - withholdingAmount) * 100) / 100
    const beneficiaryType = engagement.memberId ? 'member' : 'other'
    const beneficiaryId = engagement.memberId ?? engagement.profileId

    const payable = await insertPayable(client, {
      contractorEngagementId: engagement.contractorEngagementId,
      contractorWorkSubmissionId: input.contractorWorkSubmissionId,
      payableSourceKind: 'work_submission',
      beneficiaryType,
      beneficiaryId,
      grossAmount,
      withholdingAmount,
      netPayable,
      currency: submission.currency ?? engagement.currency,
      paymentCurrency: engagement.paymentCurrency,
      fxPolicyCode: engagement.fxPolicyCode,
      taxComplianceOwner: engagement.taxComplianceOwner,
      taxWithholdingPolicyCode: engagement.taxWithholdingPolicyCode,
      payrollVia: engagement.payrollVia,
      paymentProfileId: input.paymentProfileId ?? null,
      dueDate: input.dueDate ?? null,
      sourceSnapshot: {
        engagementPublicId: engagement.publicId,
        relationshipSubtype: engagement.relationshipSubtype,
        paymentModel: engagement.paymentModel,
        taxWithholdingRateSnapshot: engagement.taxWithholdingRateSnapshot
      },
      actorUserId: input.actorUserId
    })

    // Consume the submission in the same tx (idempotency / dup guard).
    await client.query(
      `UPDATE greenhouse_hr.contractor_work_submissions
       SET consumed_by_payable_id = $2, consumed_at = NOW()
       WHERE contractor_work_submission_id = $1`,
      [input.contractorWorkSubmissionId, payable.contractorPayableId]
    )

    await client.query(
      `INSERT INTO greenhouse_hr.contractor_work_submission_events (
         event_id, contractor_work_submission_id, event_type, actor_user_id, metadata_json
       ) VALUES ($1, $2, 'consumed', $3, $4::jsonb)`,
      [
        `cwse-${randomUUID()}`,
        input.contractorWorkSubmissionId,
        input.actorUserId,
        JSON.stringify({ payableId: payable.contractorPayableId })
      ]
    )

    await appendPayableEvent(client, {
      contractorPayableId: payable.contractorPayableId,
      eventType: 'created',
      toStatus: payable.status,
      actorUserId: input.actorUserId,
      metadata: { source: 'work_submission', workSubmissionId: input.contractorWorkSubmissionId }
    })

    await publishPayableEvent(client, payable, EVENT_TYPES.contractorPayableCreated, {
      payableSourceKind: 'work_submission'
    })

    return payable
  })

/**
 * Create an off-cycle payable directly from an engagement (adjustment, bonus,
 * reimbursement). Requires reason. No work submission linkage.
 */
export const createContractorPayableOffCycle = async (
  input: CreateContractorPayableOffCycleInput
): Promise<ContractorPayable> => {
  if ((input.reason ?? '').trim().length < 10) {
    throw new ContractorEngagementValidationError(
      'La razón es obligatoria (mínimo 10 caracteres) para un payable off-cycle.',
      'off_cycle_reason_required',
      400
    )
  }

  if (!(input.grossAmount > 0)) {
    throw new ContractorEngagementValidationError(
      'El monto bruto debe ser mayor a 0.',
      'invalid_gross_amount',
      400
    )
  }

  const engagement = await getContractorEngagementById(input.contractorEngagementId)

  if (!engagement) {
    throw new ContractorEngagementValidationError(
      'El engagement contractor no existe.',
      'engagement_not_found',
      404
    )
  }

  const grossAmount = Math.round(input.grossAmount * 100) / 100

  const withholdingAmount = computeContractorWithholding({
    relationshipSubtype: engagement.relationshipSubtype,
    taxComplianceOwner: engagement.taxComplianceOwner,
    taxWithholdingRateSnapshot: engagement.taxWithholdingRateSnapshot,
    grossAmount
  })

  const netPayable = Math.round((grossAmount - withholdingAmount) * 100) / 100
  const beneficiaryType = engagement.memberId ? 'member' : 'other'
  const beneficiaryId = engagement.memberId ?? engagement.profileId

  return withGreenhousePostgresTransaction(async (client) => {
    const payable = await insertPayable(client, {
      contractorEngagementId: engagement.contractorEngagementId,
      contractorWorkSubmissionId: null,
      payableSourceKind: 'off_cycle',
      beneficiaryType,
      beneficiaryId,
      grossAmount,
      withholdingAmount,
      netPayable,
      currency: input.currency ?? engagement.currency,
      paymentCurrency: input.paymentCurrency ?? engagement.paymentCurrency,
      fxPolicyCode: engagement.fxPolicyCode,
      taxComplianceOwner: engagement.taxComplianceOwner,
      taxWithholdingPolicyCode: engagement.taxWithholdingPolicyCode,
      payrollVia: engagement.payrollVia,
      paymentProfileId: input.paymentProfileId ?? null,
      dueDate: input.dueDate ?? null,
      sourceSnapshot: {
        engagementPublicId: engagement.publicId,
        relationshipSubtype: engagement.relationshipSubtype,
        reason: input.reason.trim()
      },
      actorUserId: input.actorUserId
    })

    await appendPayableEvent(client, {
      contractorPayableId: payable.contractorPayableId,
      eventType: 'created',
      toStatus: payable.status,
      actorUserId: input.actorUserId,
      reason: input.reason.trim(),
      metadata: { source: 'off_cycle' }
    })

    await publishPayableEvent(client, payable, EVENT_TYPES.contractorPayableCreated, {
      payableSourceKind: 'off_cycle'
    })

    return payable
  })
}
