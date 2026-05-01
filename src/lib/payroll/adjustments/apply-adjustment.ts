// TASK-745 — Mutating helpers for payroll adjustments lifecycle.
//
// createAdjustment / approveAdjustment / revertAdjustment / supersedeAdjustment.
// Cada uno emite el outbox event correspondiente dentro de la misma transaccion
// para garantizar consistencia event-sourced.

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type {
  AdjustmentKind,
  AdjustmentSourceKind,
  AdjustmentStatus,
  PayrollAdjustment
} from '@/types/payroll-adjustments'

import {
  isAdjustmentReasonCode,
  type AdjustmentReasonCode
} from './reason-codes'

export { checkChileDependentCompliance } from './compliance'
export type { ChileComplianceCheckInput } from './compliance'

const PAYROLL_ADJUSTMENTS_REQUIRE_APPROVAL =
  process.env.PAYROLL_ADJUSTMENTS_REQUIRE_APPROVAL === 'true'

interface CreateAdjustmentInput {
  payrollEntryId: string
  memberId: string
  periodId: string
  kind: AdjustmentKind
  payload: Record<string, unknown>
  reasonCode: AdjustmentReasonCode
  reasonNote: string
  sourceKind?: AdjustmentSourceKind
  sourceRef?: string | null
  effectiveAt?: string
  requestedBy: string
  // Override del global env. Si se pasa, ignora env.
  forceStatus?: 'active' | 'pending_approval'
}

export class PayrollAdjustmentValidationError extends Error {
  statusCode: number
  details?: unknown

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message)
    this.name = 'PayrollAdjustmentValidationError'
    this.statusCode = statusCode
    this.details = details
  }
}

const validateInputSync = (input: CreateAdjustmentInput): void => {
  if (!input.payrollEntryId) throw new PayrollAdjustmentValidationError('payrollEntryId is required')
  if (!input.memberId) throw new PayrollAdjustmentValidationError('memberId is required')
  if (!input.periodId) throw new PayrollAdjustmentValidationError('periodId is required')
  if (!input.kind) throw new PayrollAdjustmentValidationError('kind is required')

  if (!isAdjustmentReasonCode(input.reasonCode)) {
    throw new PayrollAdjustmentValidationError(`reasonCode invalido: ${input.reasonCode}`)
  }

  if (!input.reasonNote || input.reasonNote.trim().length < 5) {
    throw new PayrollAdjustmentValidationError('reasonNote requiere al menos 5 caracteres')
  }

  if (!input.requestedBy) throw new PayrollAdjustmentValidationError('requestedBy is required')

  // Validar payload por kind
  switch (input.kind) {
    case 'exclude':
      // payload puede ser {} o ignorado
      break

    case 'gross_factor': {
      const f = Number((input.payload as { factor?: number }).factor)

      if (!Number.isFinite(f) || f < 0 || f > 1) {
        throw new PayrollAdjustmentValidationError(
          `gross_factor.factor debe estar en [0, 1], recibido ${f}`
        )
      }

      break
    }

    case 'gross_factor_per_component': {
      const comps = (input.payload as { components?: Record<string, number> }).components

      if (!comps || typeof comps !== 'object') {
        throw new PayrollAdjustmentValidationError(
          'gross_factor_per_component.components debe ser un map<string, number>'
        )
      }

      for (const [key, value] of Object.entries(comps)) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
          throw new PayrollAdjustmentValidationError(
            `components.${key} debe estar en [0, 1], recibido ${value}`
          )
        }
      }

      break
    }

    case 'fixed_deduction': {
      const a = Number((input.payload as { amount?: number }).amount)

      if (!Number.isFinite(a) || a <= 0) {
        throw new PayrollAdjustmentValidationError(
          `fixed_deduction.amount debe ser numero positivo, recibido ${a}`
        )
      }

      break
    }

    case 'manual_override': {
      const v = Number((input.payload as { netClp?: number }).netClp)

      if (!Number.isFinite(v)) {
        throw new PayrollAdjustmentValidationError('manual_override.netClp debe ser numero')
      }

      break
    }
  }
}

const buildAdjustmentId = (): string => `adj-${randomUUID()}`

const resolveInitialStatus = (input: CreateAdjustmentInput): AdjustmentStatus => {
  if (input.forceStatus) return input.forceStatus

  if (input.sourceKind === 'reliquidation_clone' || input.sourceKind === 'recurring_schedule') {
    // Clones automaticos nacen activos (TASK-409, TASK-746). No requieren aprobacion humana.
    return 'active'
  }

  return PAYROLL_ADJUSTMENTS_REQUIRE_APPROVAL ? 'pending_approval' : 'active'
}

interface AdjustmentRow extends Record<string, unknown> {
  adjustment_id: string
  payroll_entry_id: string
  member_id: string
  period_id: string
  kind: string
  payload: Record<string, unknown>
  source_kind: string
  source_ref: string | null
  reason_code: string
  reason_note: string
  status: string
  requested_by: string
  requested_at: string
  approved_by: string | null
  approved_at: string | null
  reverted_by: string | null
  reverted_at: string | null
  reverted_reason: string | null
  superseded_by: string | null
  effective_at: string
  version: number
  created_at: string
  updated_at: string
}

const mapAdjustment = (row: AdjustmentRow): PayrollAdjustment => ({
  adjustmentId: row.adjustment_id,
  payrollEntryId: row.payroll_entry_id,
  memberId: row.member_id,
  periodId: row.period_id,
  kind: row.kind as AdjustmentKind,
  payload: row.payload,
  sourceKind: row.source_kind as AdjustmentSourceKind,
  sourceRef: row.source_ref,
  reasonCode: row.reason_code as AdjustmentReasonCode,
  reasonNote: row.reason_note,
  status: row.status as AdjustmentStatus,
  requestedBy: row.requested_by,
  requestedAt: row.requested_at,
  approvedBy: row.approved_by,
  approvedAt: row.approved_at,
  revertedBy: row.reverted_by,
  revertedAt: row.reverted_at,
  revertedReason: row.reverted_reason,
  supersededBy: row.superseded_by,
  effectiveAt: row.effective_at,
  version: row.version,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

// ── Public API ──────────────────────────────────────────────────────

/**
 * Create a new adjustment. Honors compliance Chile via DB trigger; on FK / CHECK violations
 * surfaces a validation error with the original Postgres message.
 *
 * Returns the created adjustment plus the outbox event id emitted in the same transaction.
 */
export async function createAdjustment(
  input: CreateAdjustmentInput
): Promise<{ adjustment: PayrollAdjustment; eventId: string }> {
  validateInputSync(input)

  const adjustmentId = buildAdjustmentId()
  const status = resolveInitialStatus(input)

  return withTransaction(async (client: PoolClient) => {
    const result = await client.query<AdjustmentRow>(
      `INSERT INTO greenhouse_payroll.payroll_adjustments (
         adjustment_id, payroll_entry_id, member_id, period_id,
         kind, payload, source_kind, source_ref,
         reason_code, reason_note, status,
         requested_by, requested_at,
         effective_at,
         approved_by, approved_at
       )
       VALUES ($1, $2, $3, $4,
               $5, $6::jsonb, $7, $8,
               $9, $10, $11,
               $12, now(),
               COALESCE($13::timestamptz, now()),
               $14, $15)
       RETURNING *`,
      [
        adjustmentId,
        input.payrollEntryId,
        input.memberId,
        input.periodId,
        input.kind,
        JSON.stringify(input.payload ?? {}),
        input.sourceKind ?? 'manual',
        input.sourceRef ?? null,
        input.reasonCode,
        input.reasonNote,
        status,
        input.requestedBy,
        input.effectiveAt ?? null,
        status === 'active' ? input.requestedBy : null,
        status === 'active' ? new Date().toISOString() : null
      ]
    )

    const row = result.rows[0]
    const adjustment = mapAdjustment(row)

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'payroll_adjustment',
        aggregateId: adjustment.adjustmentId,
        eventType: 'payroll.adjustment.created',
        payload: {
          adjustmentId: adjustment.adjustmentId,
          payrollEntryId: adjustment.payrollEntryId,
          memberId: adjustment.memberId,
          periodId: adjustment.periodId,
          kind: adjustment.kind,
          payloadSnapshot: adjustment.payload,
          status: adjustment.status,
          sourceKind: adjustment.sourceKind,
          sourceRef: adjustment.sourceRef,
          reasonCode: adjustment.reasonCode,
          requestedBy: adjustment.requestedBy
        }
      },
      client
    )

    return { adjustment, eventId }
  })
}

export async function approveAdjustment(args: {
  adjustmentId: string
  approverUserId: string
}): Promise<PayrollAdjustment> {
  return withTransaction(async (client: PoolClient) => {
    const result = await client.query<AdjustmentRow>(
      `UPDATE greenhouse_payroll.payroll_adjustments
          SET status = 'active',
              approved_by = $1,
              approved_at = now(),
              version = version + 1,
              updated_at = now()
        WHERE adjustment_id = $2
          AND status = 'pending_approval'
        RETURNING *`,
      [args.approverUserId, args.adjustmentId]
    )

    if (result.rowCount === 0) {
      throw new PayrollAdjustmentValidationError(
        'No se encontro adjustment en pending_approval con ese id',
        404
      )
    }

    const adjustment = mapAdjustment(result.rows[0])

    await publishOutboxEvent(
      {
        aggregateType: 'payroll_adjustment',
        aggregateId: adjustment.adjustmentId,
        eventType: 'payroll.adjustment.approved',
        payload: {
          adjustmentId: adjustment.adjustmentId,
          payrollEntryId: adjustment.payrollEntryId,
          memberId: adjustment.memberId,
          periodId: adjustment.periodId,
          kind: adjustment.kind,
          approvedBy: adjustment.approvedBy
        }
      },
      client
    )

    return adjustment
  })
}

export async function revertAdjustment(args: {
  adjustmentId: string
  revertedByUserId: string
  revertedReason: string
}): Promise<PayrollAdjustment> {
  if (!args.revertedReason || args.revertedReason.trim().length < 5) {
    throw new PayrollAdjustmentValidationError('revertedReason requiere al menos 5 caracteres')
  }

  return withTransaction(async (client: PoolClient) => {
    const result = await client.query<AdjustmentRow>(
      `UPDATE greenhouse_payroll.payroll_adjustments
          SET status = 'reverted',
              reverted_by = $1,
              reverted_at = now(),
              reverted_reason = $2,
              version = version + 1,
              updated_at = now()
        WHERE adjustment_id = $3
          AND status IN ('active', 'pending_approval')
        RETURNING *`,
      [args.revertedByUserId, args.revertedReason, args.adjustmentId]
    )

    if (result.rowCount === 0) {
      throw new PayrollAdjustmentValidationError(
        'No se encontro adjustment activo o pendiente con ese id',
        404
      )
    }

    const adjustment = mapAdjustment(result.rows[0])

    await publishOutboxEvent(
      {
        aggregateType: 'payroll_adjustment',
        aggregateId: adjustment.adjustmentId,
        eventType: 'payroll.adjustment.reverted',
        payload: {
          adjustmentId: adjustment.adjustmentId,
          payrollEntryId: adjustment.payrollEntryId,
          memberId: adjustment.memberId,
          periodId: adjustment.periodId,
          kind: adjustment.kind,
          revertedBy: adjustment.revertedBy,
          revertedReason: adjustment.revertedReason
        }
      },
      client
    )

    return adjustment
  })
}

// ── Reads ──────────────────────────────────────────────────────

export async function getAdjustmentsByEntry(
  payrollEntryId: string,
  options?: { activeOnly?: boolean }
): Promise<PayrollAdjustment[]> {
  const filter = options?.activeOnly ? `AND status = 'active'` : ''

  const rows = await query<AdjustmentRow>(
    `SELECT * FROM greenhouse_payroll.payroll_adjustments
      WHERE payroll_entry_id = $1
      ${filter}
      ORDER BY requested_at DESC`,
    [payrollEntryId]
  )

  return rows.map(mapAdjustment)
}

export async function getActiveAdjustmentsForPeriod(
  periodId: string
): Promise<PayrollAdjustment[]> {
  const rows = await query<AdjustmentRow>(
    `SELECT * FROM greenhouse_payroll.payroll_adjustments
      WHERE period_id = $1 AND status = 'active'
      ORDER BY requested_at DESC`,
    [periodId]
  )

  return rows.map(mapAdjustment)
}

// ── Reliquidacion clone (TASK-409 reopen flow) ──────────────────────

export async function cloneActiveAdjustmentsToV2(args: {
  v1EntryId: string
  v2EntryId: string
  triggeredBy: string
}): Promise<{ cloned: number }> {
  const active = await getAdjustmentsByEntry(args.v1EntryId, { activeOnly: true })

  let cloned = 0

  for (const original of active) {
    await createAdjustment({
      payrollEntryId: args.v2EntryId,
      memberId: original.memberId,
      periodId: original.periodId,
      kind: original.kind,
      payload: original.payload,
      reasonCode: original.reasonCode,
      reasonNote: `[clon v1→v2 por reapertura] ${original.reasonNote}`,
      sourceKind: 'reliquidation_clone',
      sourceRef: original.adjustmentId,
      requestedBy: args.triggeredBy,
      forceStatus: 'active'
    })
    cloned += 1
  }

  return { cloned }
}

// Compliance preview se exporta desde ./compliance (client-safe).
