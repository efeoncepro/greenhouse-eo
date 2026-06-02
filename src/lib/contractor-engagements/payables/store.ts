import 'server-only'

import { randomUUID } from 'crypto'

import type { PoolClient } from 'pg'

import { query, withGreenhousePostgresTransaction } from '@/lib/db'
import { getLatestStoredExchangeRatePair } from '@/lib/finance/exchange-rates'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  buildHonorariosPolicySnapshot,
  CHILE_HONORARIOS_SUBTYPE,
  computeChileHonorariosPayout
} from '../chile-honorarios'
import { resolveHonorariosReadiness } from '../chile-honorarios/readiness'
import { isClassificationRiskBlocking } from '../classification-risk'
import { ContractorEngagementValidationError } from '../errors'
import { listContractorInvoiceAssetsByEngagement } from '../invoice-assets'
import { getContractorEngagementById } from '../store'
import type { ContractorEngagement } from '../types'

import { isContractorAgreedAmountGuardrailEnabled } from './agreed-amount-guardrail-flag'
import { resolveContractorPaymentDueDate } from './due-date'
import { evaluatePayableReadiness } from './readiness'
import type { PayableReadinessInputs, PayableReadinessResult } from './readiness'
import { assertValidPayableTransition, isTerminalPayableStatus } from './state-machine'
import { computeContractorWithholding } from './withholding'
import type {
  ContractorPayable,
  ContractorPayableStatus,
  CreateContractorPayableFromSubmissionInput,
  CreateContractorPayableOffCycleInput
} from './types'

const PROVIDER_OWNED_PAYROLL_VIA = new Set(['deel', 'remote', 'oyster'])
const FINANCE_CURRENCIES = new Set(['CLP', 'USD'])

/**
 * TASK-968 — rate types whose `rate_amount` is a PERIOD/lump total the gross can be
 * compared against (the agreed-amount guardrail applies). Unit-rate types (`hourly`,
 * `daily`) are excluded: a period gross is qty × rate, which legitimately exceeds the
 * unit rate, so a single comparison is meaningless → guardrail no-op for those.
 */
const PERIOD_AGREED_RATE_TYPES = new Set(['fixed', 'retainer', 'milestone', 'project'])

/**
 * TASK-797 — Política de invoices/payables post-cierre. Tras `ended`, NO se crean
 * payables salvo allowance explícito (`post_closure_invoices_allowed`). `cancelled`
 * NUNCA permite payables. Durante `ending` (winding-down) sí se liquidan los
 * payables de trabajo ya aprobado.
 */
const assertPayableCreationAllowedForClosure = (engagement: ContractorEngagement): void => {
  if (engagement.status === 'cancelled') {
    throw new ContractorEngagementValidationError(
      'El engagement está cancelado; no se pueden crear payables.',
      'engagement_cancelled_no_payables',
      409
    )
  }

  if (engagement.status === 'ended' && !engagement.postClosureInvoicesAllowed) {
    throw new ContractorEngagementValidationError(
      'El engagement está cerrado; los payables post-cierre requieren autorización explícita.',
      'engagement_closed_payables_not_allowed',
      409
    )
  }
}

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
  agreed_amount_override_reason: string | null
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
  agreedAmountOverrideReason: row.agreed_amount_override_reason,
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
  payment_profile_id, payment_profile_waiver_reason, agreed_amount_override_reason,
  due_date, status, finance_obligation_id,
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

type PayableEventType =
  | 'created'
  | 'ready_for_finance'
  | 'obligation_created'
  | 'payment_order_created'
  | 'paid'
  | 'blocked'
  | 'cancelled'
  | 'updated'

export const appendPayableEvent = async (
  client: PoolClient,
  params: {
    contractorPayableId: string
    eventType: PayableEventType
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

interface InsertPayableValues {
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

const insertPayable = async (
  client: PoolClient,
  values: InsertPayableValues
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

// ── Create commands ───────────────────────────────────────────────────────────

/**
 * Create a payable from an approved work submission. Marks the submission
 * consumed in the SAME transaction (dup-guard: DB UNIQUE index + the
 * approved+unconsumed lock here).
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

    assertPayableCreationAllowedForClosure(engagement)

    const withholdingAmount = computeContractorWithholding({
      relationshipSubtype: engagement.relationshipSubtype,
      taxComplianceOwner: engagement.taxComplianceOwner,
      taxWithholdingRateSnapshot: engagement.taxWithholdingRateSnapshot,
      grossAmount
    })

    const netPayable = Math.round((grossAmount - withholdingAmount) * 100) / 100
    const beneficiaryType = engagement.memberId ? 'member' : 'other'
    const beneficiaryId = engagement.memberId ?? engagement.profileId

    const honorariosPolicy = buildHonorariosPolicySnapshot({
      relationshipSubtype: engagement.relationshipSubtype,
      taxWithholdingPolicyCode: engagement.taxWithholdingPolicyCode,
      taxWithholdingRateSnapshot: engagement.taxWithholdingRateSnapshot,
      startDate: engagement.startDate
    })

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
      dueDate: input.dueDate ?? resolveContractorPaymentDueDate(),
      sourceSnapshot: {
        engagementPublicId: engagement.publicId,
        relationshipSubtype: engagement.relationshipSubtype,
        paymentModel: engagement.paymentModel,
        taxWithholdingRateSnapshot: engagement.taxWithholdingRateSnapshot,
        ...(honorariosPolicy ? { honorariosPolicy } : {})
      },
      actorUserId: input.actorUserId
    })

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

  assertPayableCreationAllowedForClosure(engagement)

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

  const honorariosPolicy = buildHonorariosPolicySnapshot({
    relationshipSubtype: engagement.relationshipSubtype,
    taxWithholdingPolicyCode: engagement.taxWithholdingPolicyCode,
    taxWithholdingRateSnapshot: engagement.taxWithholdingRateSnapshot,
    startDate: engagement.startDate
  })

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
      dueDate: input.dueDate ?? resolveContractorPaymentDueDate(),
      sourceSnapshot: {
        engagementPublicId: engagement.publicId,
        relationshipSubtype: engagement.relationshipSubtype,
        reason: input.reason.trim(),
        ...(honorariosPolicy ? { honorariosPolicy } : {})
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

// ── Readiness + lifecycle ───────────────────────────────────────────────────

/**
 * Resolve readiness inputs (invoice asset, FX, source approval) and evaluate the
 * fail-closed gate. Payment-profile gate (V1): explicit `payment_profile_id` OR a
 * governed waiver. Auto-resolution via resolvePaymentRoute is a V1.1 enhancement.
 */
export const assessPayableReadiness = async (
  payable: ContractorPayable
): Promise<PayableReadinessResult> => {
  const engagement = await getContractorEngagementById(payable.contractorEngagementId)

  if (!engagement) {
    throw new ContractorEngagementValidationError(
      'El engagement contractor no existe.',
      'engagement_not_found',
      404
    )
  }

  let sourceApproved = true

  if (payable.payableSourceKind === 'work_submission' && payable.contractorWorkSubmissionId) {
    const subRows = await query<{ status: string; [column: string]: unknown }>(
      `SELECT status FROM greenhouse_hr.contractor_work_submissions
       WHERE contractor_work_submission_id = $1`,
      [payable.contractorWorkSubmissionId]
    )

    sourceApproved = subRows[0]?.status === 'approved'
  }

  let hasRequiredInvoiceAsset = true

  if (engagement.requiresInvoice) {
    const assets = await listContractorInvoiceAssetsByEngagement(payable.contractorEngagementId)

    hasRequiredInvoiceAsset = assets.some(
      a => a.assetRole === 'invoice_pdf' || a.assetRole === 'tax_xml'
    )
  }

  const obligationCurrency = payable.paymentCurrency ?? payable.currency
  const fxNeeded = payable.paymentCurrency !== null && payable.paymentCurrency !== payable.currency
  let fxSupported = !fxNeeded

  if (
    fxNeeded &&
    FINANCE_CURRENCIES.has(payable.currency) &&
    FINANCE_CURRENCIES.has(obligationCurrency)
  ) {
    const rate = await getLatestStoredExchangeRatePair({
      fromCurrency: payable.currency as 'CLP' | 'USD',
      toCurrency: obligationCurrency as 'CLP' | 'USD'
    })

    fxSupported = rate !== null
  }

  // ── TASK-794 — Chile honorarios compliance gates ────────────────────────────
  // Classification risk blocks ANY lane (universal). Mirrors the engagement
  // lifecycle CHECK `active ⇒ classification_risk no bloqueante` as a payable-level
  // defense: a payable created while the engagement was clear must not reach
  // Finance if the engagement later escalated to legal_review_required/blocked.
  const classificationRiskBlocking = isClassificationRiskBlocking(engagement.classificationRiskStatus)

  const isHonorarios = engagement.relationshipSubtype === CHILE_HONORARIOS_SUBTYPE

  let rutVerified = true
  let rutBlockerDetail: string | null = null
  let honorariosWithholdingConsistent = true

  if (isHonorarios) {
    // Verified CL_RUT is a fail-closed blocker for honorarios (boleta). Address
    // not required (person-legal-profile `honorarios_closure` excludes it).
    const honorariosReadiness = await resolveHonorariosReadiness({ profileId: engagement.profileId })

    rutVerified = honorariosReadiness.rutVerified
    rutBlockerDetail = honorariosReadiness.blockerCode

    // Recompute the SII-only payout from the engagement snapshot rate and assert
    // the persisted withholding/net match. Any divergence means a dependent
    // deduction or a wrong rate is embedded in the payable → block.
    const expected = computeChileHonorariosPayout({
      grossAmount: payable.grossAmount,
      rateSnapshot: engagement.taxWithholdingRateSnapshot
    })

    honorariosWithholdingConsistent =
      Math.round(payable.withholdingAmount * 100) / 100 === expected.withholdingAmount &&
      Math.round(payable.netPayable * 100) / 100 === expected.netPayable
  }

  // ── TASK-795 Fase A — tax-owner boundary gate ───────────────────────────────
  // Block when the tax treatment needs human review or a country withholding
  // engine that does not yet exist. `manual_review_required` = explicit human
  // review; `country_engine_owned` = the international_internal engine (TASK-905)
  // owns it — until that engine ships, the withholding is unresolved, so block.
  // The contractor domain NEVER applies a Chile→non-resident rate itself (D-795-4).
  const taxOwnerReviewRequired =
    engagement.taxComplianceOwner === 'manual_review_required' ||
    engagement.taxComplianceOwner === 'country_engine_owned'

  const readinessInputs: PayableReadinessInputs = {
    sourceApproved,
    requiresInvoice: engagement.requiresInvoice,
    hasRequiredInvoiceAsset,
    grossAmount: payable.grossAmount,
    withholdingAmount: payable.withholdingAmount,
    netPayable: payable.netPayable,
    obligationCurrency,
    fxNeeded,
    fxSupported,
    paymentProfileResolved: payable.paymentProfileId !== null,
    paymentProfileWaived: payable.paymentProfileWaiverReason !== null,
    providerOwned: PROVIDER_OWNED_PAYROLL_VIA.has(engagement.payrollVia),
    hasProviderRef: engagement.providerContractId !== null,
    classificationRiskBlocking,
    isHonorarios,
    rutVerified,
    rutBlockerDetail,
    honorariosWithholdingConsistent,
    taxOwnerReviewRequired,
    taxOwnerDetail: taxOwnerReviewRequired ? engagement.taxComplianceOwner : null,
    // TASK-795 Fase A — cross-currency must declare an explicit FX policy.
    fxPolicyDeclared: (payable.fxPolicyCode ?? engagement.fxPolicyCode) !== null,
    // TASK-968 — agreed-amount guardrail. Only meaningful when the engagement
    // declares a period agreed amount (not a unit rate). Override lives on the payable.
    agreedAmountGuardrailEnabled: isContractorAgreedAmountGuardrailEnabled(),
    agreedAmount:
      PERIOD_AGREED_RATE_TYPES.has(engagement.rateType) && engagement.rateAmount !== null
        ? engagement.rateAmount
        : null,
    agreedAmountOverridden: payable.agreedAmountOverrideReason !== null
  }

  return evaluatePayableReadiness(readinessInputs)
}

const lockPayable = async (
  client: PoolClient,
  contractorPayableId: string
): Promise<ContractorPayable> => {
  const result = await client.query<ContractorPayableRow>(
    `SELECT ${PAYABLE_SELECT_COLUMNS}
     FROM greenhouse_hr.contractor_payables
     WHERE contractor_payable_id = $1
     FOR UPDATE`,
    [contractorPayableId]
  )

  if (!result.rows[0]) {
    throw new ContractorEngagementValidationError('El payable no existe.', 'payable_not_found', 404)
  }

  return mapContractorPayable(result.rows[0])
}

const updatePayableStatus = async (
  client: PoolClient,
  contractorPayableId: string,
  status: ContractorPayableStatus,
  patch: { readiness?: PayableReadinessResult } = {}
): Promise<ContractorPayable> => {
  const sets = ['status = $2']
  const params: unknown[] = [contractorPayableId, status]

  if (patch.readiness) {
    params.push(JSON.stringify(patch.readiness))
    sets.push(`readiness_json = $${params.length}::jsonb`)
  }

  const result = await client.query<ContractorPayableRow>(
    `UPDATE greenhouse_hr.contractor_payables
     SET ${sets.join(', ')}
     WHERE contractor_payable_id = $1
     RETURNING ${PAYABLE_SELECT_COLUMNS}`,
    params
  )

  return mapContractorPayable(result.rows[0])
}

/**
 * Evaluate readiness and, if ready, transition to `ready_for_finance` (emits the
 * event that triggers the Finance bridge). If blocked, persist the blockers and
 * move to `blocked`, then throw so the caller surfaces why.
 */
export const transitionPayableToReadyForFinance = async (input: {
  contractorPayableId: string
  actorUserId: string
}): Promise<ContractorPayable> =>
  withGreenhousePostgresTransaction(async (client) => {
    const current = await lockPayable(client, input.contractorPayableId)

    if (current.status === 'ready_for_finance') {
      return current
    }

    if (current.status !== 'pending_readiness' && current.status !== 'blocked') {
      throw new ContractorEngagementValidationError(
        `No se puede evaluar readiness desde el estado ${current.status}.`,
        'payable_not_assessable',
        409
      )
    }

    const readiness = await assessPayableReadiness(current)

    if (!readiness.ready) {
      assertValidPayableTransition(current.status, 'blocked')

      const blocked = await updatePayableStatus(client, current.contractorPayableId, 'blocked', {
        readiness
      })

      await appendPayableEvent(client, {
        contractorPayableId: blocked.contractorPayableId,
        eventType: 'blocked',
        fromStatus: current.status,
        toStatus: blocked.status,
        actorUserId: input.actorUserId,
        metadata: { blockers: readiness.blockers }
      })
      await publishPayableEvent(client, blocked, EVENT_TYPES.contractorPayableBlocked, {
        blockerCodes: readiness.blockers.map(b => b.code)
      })

      throw new ContractorEngagementValidationError(
        'El payable no cumple readiness para Finance.',
        'payable_not_ready',
        409,
        { blockers: readiness.blockers }
      )
    }

    assertValidPayableTransition(current.status, 'ready_for_finance')

    const ready = await updatePayableStatus(
      client,
      current.contractorPayableId,
      'ready_for_finance',
      { readiness }
    )

    await appendPayableEvent(client, {
      contractorPayableId: ready.contractorPayableId,
      eventType: 'ready_for_finance',
      fromStatus: current.status,
      toStatus: ready.status,
      actorUserId: input.actorUserId
    })

    await publishPayableEvent(client, ready, EVENT_TYPES.contractorPayableReadyForFinance)

    return ready
  })

/** Governed waiver of the payment-profile gate (capability-gated upstream). */
export const waivePayablePaymentProfile = async (input: {
  contractorPayableId: string
  reason: string
  actorUserId: string
}): Promise<ContractorPayable> =>
  withGreenhousePostgresTransaction(async (client) => {
    if ((input.reason ?? '').trim().length < 10) {
      throw new ContractorEngagementValidationError(
        'El motivo del waiver es obligatorio (mínimo 10 caracteres).',
        'waiver_reason_required',
        400
      )
    }

    const current = await lockPayable(client, input.contractorPayableId)

    if (isTerminalPayableStatus(current.status)) {
      throw new ContractorEngagementValidationError(
        'No se puede waivear un payable terminal.',
        'payable_terminal',
        409
      )
    }

    const result = await client.query<ContractorPayableRow>(
      `UPDATE greenhouse_hr.contractor_payables
       SET payment_profile_waiver_reason = $2
       WHERE contractor_payable_id = $1
       RETURNING ${PAYABLE_SELECT_COLUMNS}`,
      [input.contractorPayableId, input.reason.trim()]
    )

    const updated = mapContractorPayable(result.rows[0])

    await appendPayableEvent(client, {
      contractorPayableId: updated.contractorPayableId,
      eventType: 'updated',
      actorUserId: input.actorUserId,
      reason: input.reason.trim(),
      metadata: { paymentProfileWaiver: true }
    })

    return updated
  })

/**
 * TASK-968 — Governed override of the agreed-amount guardrail (capability-gated
 * upstream: `finance.contractor_payable.override_agreed_amount`, admin-only).
 * Maker-checker: the actor here MUST differ from whoever SET the engagement amount
 * (SoD enforced at the capability layer — distinct HR vs Finance capabilities).
 * The reason lives on the payable; actor + timestamp live in the append-only audit.
 */
export const overridePayableAgreedAmount = async (input: {
  contractorPayableId: string
  reason: string
  actorUserId: string
}): Promise<ContractorPayable> =>
  withGreenhousePostgresTransaction(async (client) => {
    if ((input.reason ?? '').trim().length < 10) {
      throw new ContractorEngagementValidationError(
        'El motivo del override es obligatorio (mínimo 10 caracteres).',
        'agreed_amount_override_reason_required',
        400
      )
    }

    const current = await lockPayable(client, input.contractorPayableId)

    if (isTerminalPayableStatus(current.status)) {
      throw new ContractorEngagementValidationError(
        'No se puede aplicar override a un payable terminal.',
        'payable_terminal',
        409
      )
    }

    const result = await client.query<ContractorPayableRow>(
      `UPDATE greenhouse_hr.contractor_payables
       SET agreed_amount_override_reason = $2
       WHERE contractor_payable_id = $1
       RETURNING ${PAYABLE_SELECT_COLUMNS}`,
      [input.contractorPayableId, input.reason.trim()]
    )

    const updated = mapContractorPayable(result.rows[0])

    await appendPayableEvent(client, {
      contractorPayableId: updated.contractorPayableId,
      eventType: 'updated',
      actorUserId: input.actorUserId,
      reason: input.reason.trim(),
      metadata: { agreedAmountOverride: true }
    })

    return updated
  })

export const cancelContractorPayable = async (input: {
  contractorPayableId: string
  reason?: string | null
  actorUserId: string
}): Promise<ContractorPayable> =>
  withGreenhousePostgresTransaction(async (client) => {
    const current = await lockPayable(client, input.contractorPayableId)

    if (current.status === 'cancelled') {
      return current
    }

    assertValidPayableTransition(current.status, 'cancelled')

    const updated = await updatePayableStatus(client, current.contractorPayableId, 'cancelled')

    await appendPayableEvent(client, {
      contractorPayableId: updated.contractorPayableId,
      eventType: 'cancelled',
      fromStatus: current.status,
      toStatus: updated.status,
      actorUserId: input.actorUserId,
      reason: input.reason ?? null
    })
    await publishPayableEvent(client, updated, EVENT_TYPES.contractorPayableCancelled, {
      fromStatus: current.status
    })

    return updated
  })

/**
 * Mark the payable as having generated its Finance obligation (called by the
 * bridge after createPaymentObligation). Idempotent: re-delivery of the same
 * obligation is a no-op.
 */
export const markPayableObligationCreated = async (input: {
  contractorPayableId: string
  financeObligationId: string
  actorUserId: string
}): Promise<ContractorPayable> =>
  withGreenhousePostgresTransaction(async (client) => {
    const current = await lockPayable(client, input.contractorPayableId)

    if (
      current.status === 'obligation_created' &&
      current.financeObligationId === input.financeObligationId
    ) {
      return current
    }

    if (current.status !== 'ready_for_finance') {
      throw new ContractorEngagementValidationError(
        `No se puede registrar la obligación desde el estado ${current.status}.`,
        'payable_not_ready_for_obligation',
        409
      )
    }

    const result = await client.query<ContractorPayableRow>(
      `UPDATE greenhouse_hr.contractor_payables
       SET status = 'obligation_created', finance_obligation_id = $2
       WHERE contractor_payable_id = $1
       RETURNING ${PAYABLE_SELECT_COLUMNS}`,
      [input.contractorPayableId, input.financeObligationId]
    )

    const updated = mapContractorPayable(result.rows[0])

    await appendPayableEvent(client, {
      contractorPayableId: updated.contractorPayableId,
      eventType: 'obligation_created',
      fromStatus: current.status,
      toStatus: updated.status,
      actorUserId: input.actorUserId,
      metadata: { financeObligationId: input.financeObligationId }
    })
    await publishPayableEvent(client, updated, EVENT_TYPES.contractorPayableObligationCreated, {
      financeObligationId: input.financeObligationId
    })

    return updated
  })

/**
 * TASK-979 — transición canónica `obligation_created → payment_order_created`.
 *
 * Es el writer ÚNICO de `payment_order_created` para contractor payables: cuando la
 * corrida mensual (o cualquier creación de payment order desde la obligación del
 * payable) batchea la obligación en una payment order, el payable debe avanzar a
 * `payment_order_created` (la state machine exige este estado intermedio antes de
 * `paid` — sin él el payable nunca llega a `paid`).
 *
 * Dual-mode: si recibe `client`, corre dentro de la transacción del caller
 * (atomicidad con `createPaymentOrderFromObligations`); si no, abre su propia tx.
 * Idempotente: re-llamar con el mismo `paymentOrderId` cuando ya está en
 * `payment_order_created` es un no-op.
 */
const markPayablePaymentOrderCreatedTx = async (
  client: PoolClient,
  input: {
    contractorPayableId: string
    paymentOrderId: string
    actorUserId: string
  }
): Promise<ContractorPayable> => {
  const current = await lockPayable(client, input.contractorPayableId)

  if (
    current.status === 'payment_order_created' &&
    current.paymentOrderId === input.paymentOrderId
  ) {
    return current
  }

  if (current.status !== 'obligation_created') {
    throw new ContractorEngagementValidationError(
      `No se puede registrar la orden de pago desde el estado ${current.status}.`,
      'payable_not_obligation_created',
      409
    )
  }

  const result = await client.query<ContractorPayableRow>(
    `UPDATE greenhouse_hr.contractor_payables
     SET status = 'payment_order_created', payment_order_id = $2
     WHERE contractor_payable_id = $1
     RETURNING ${PAYABLE_SELECT_COLUMNS}`,
    [input.contractorPayableId, input.paymentOrderId]
  )

  const updated = mapContractorPayable(result.rows[0])

  await appendPayableEvent(client, {
    contractorPayableId: updated.contractorPayableId,
    eventType: 'payment_order_created',
    fromStatus: current.status,
    toStatus: updated.status,
    actorUserId: input.actorUserId,
    metadata: { paymentOrderId: input.paymentOrderId }
  })
  await publishPayableEvent(client, updated, EVENT_TYPES.contractorPayablePaymentOrderCreated, {
    paymentOrderId: input.paymentOrderId
  })

  return updated
}

export const markPayablePaymentOrderCreated = async (
  input: {
    contractorPayableId: string
    paymentOrderId: string
    actorUserId: string
  },
  client?: PoolClient
): Promise<ContractorPayable> => {
  if (client) {
    return markPayablePaymentOrderCreatedTx(client, input)
  }

  return withGreenhousePostgresTransaction((tx) => markPayablePaymentOrderCreatedTx(tx, input))
}

/**
 * TASK-981 — transición canónica `payment_order_created → paid`.
 *
 * Es el writer ÚNICO de `paid` para contractor payables: cuando la payment order
 * que paga el payable se marca `paid` (settlement TASK-765/977), el cascade reactivo
 * `contractor-payable-paid-cascade` invoca este writer por cada payable enlazado.
 * Appendea el evento `paid` al audit log y publica el evento de dominio canónico
 * `workforce.contractor_payable.paid v1`, que dispara el envío del comprobante
 * TASK-960 por email (consumer `contractor-payable-paid-email`).
 *
 * Antes de TASK-981 NINGÚN writer transicionaba el payable a `paid` (mismo gap-class
 * que TASK-979 cerró para `payment_order_created`); el comprobante TASK-960 (gate
 * `status='paid'`) era por tanto inalcanzable. Esto lo desbloquea.
 *
 * Dual-mode: con `client` corre en la tx del caller; sin él abre su propia tx.
 * Idempotente: re-llamar cuando ya está `paid` es un no-op (no re-emite el evento).
 */
const markPayablePaidTx = async (
  client: PoolClient,
  input: {
    contractorPayableId: string
    actorUserId: string
    paidAt?: string | null
    paymentOrderId?: string | null
  }
): Promise<ContractorPayable> => {
  const current = await lockPayable(client, input.contractorPayableId)

  // Idempotente: ya pagado → no-op (no re-emite el evento de dominio).
  if (current.status === 'paid') {
    return current
  }

  if (current.status !== 'payment_order_created') {
    throw new ContractorEngagementValidationError(
      `No se puede marcar pagado desde el estado ${current.status}.`,
      'payable_not_payment_order_created',
      409
    )
  }

  // Defensa: respeta la state machine (mirror del trigger DB).
  assertValidPayableTransition(current.status, 'paid')

  const result = await client.query<ContractorPayableRow>(
    `UPDATE greenhouse_hr.contractor_payables
     SET status = 'paid'
     WHERE contractor_payable_id = $1
     RETURNING ${PAYABLE_SELECT_COLUMNS}`,
    [input.contractorPayableId]
  )

  const updated = mapContractorPayable(result.rows[0])

  await appendPayableEvent(client, {
    contractorPayableId: updated.contractorPayableId,
    eventType: 'paid',
    fromStatus: current.status,
    toStatus: updated.status,
    actorUserId: input.actorUserId,
    metadata: {
      paymentOrderId: input.paymentOrderId ?? updated.paymentOrderId ?? null,
      paidAt: input.paidAt ?? null
    }
  })
  await publishPayableEvent(client, updated, EVENT_TYPES.contractorPayablePaid, {
    paymentOrderId: input.paymentOrderId ?? updated.paymentOrderId ?? null,
    paidAt: input.paidAt ?? null
  })

  return updated
}

export const markPayablePaid = async (
  input: {
    contractorPayableId: string
    actorUserId: string
    paidAt?: string | null
    paymentOrderId?: string | null
  },
  client?: PoolClient
): Promise<ContractorPayable> => {
  if (client) {
    return markPayablePaidTx(client, input)
  }

  return withGreenhousePostgresTransaction((tx) => markPayablePaidTx(tx, input))
}

/**
 * TASK-981 — reader del cascade `finance.payment_order.paid → payable paid`.
 *
 * Devuelve los `contractor_payable_id` enlazados a una payment order que están en
 * estado `payment_order_created` (los únicos elegibles para transicionar a `paid`).
 * Filtra por estado en SQL, por lo que órdenes no-contractor o payables ya pagados
 * NO aparecen — el cascade es idempotente y un no-op para órdenes ajenas.
 */
export const listPayableIdsByPaymentOrderForPaidCascade = async (
  paymentOrderId: string
): Promise<string[]> => {
  const rows = await query<{ contractor_payable_id: string }>(
    `SELECT contractor_payable_id
     FROM greenhouse_hr.contractor_payables
     WHERE payment_order_id = $1
       AND status = 'payment_order_created'`,
    [paymentOrderId]
  )

  return rows.map((r) => r.contractor_payable_id)
}
