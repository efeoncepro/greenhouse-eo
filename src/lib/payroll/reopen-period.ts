import 'server-only'

import { randomUUID } from 'node:crypto'

import { withTransaction } from '@/lib/db'
import { PayrollValidationError } from '@/lib/payroll/shared'
import {
  assertNoExportInProgress,
  assertPeriodReopenable,
  assertReopenWindow,
  assertValidReopenReason,
  checkPreviredDeclaredSnapshot,
  type ReopenReason
} from '@/lib/payroll/reopen-guards'
import type { PeriodStatus } from '@/types/payroll'

// TASK-410 — Lógica transaccional de reopen de nómina.
//
// El reopen transiciona el período de `exported` → `reopened`, registra
// una fila inmutable en payroll_period_reopen_audit y deja la foundation
// lista para que las entries se superseden en rounds posteriores de
// recalculate. NO crea v2 entries en este paso — esas se materializan
// cuando el operador edita y recalcula.

export interface ReopenPayrollPeriodInput {
  periodId: string
  reason: ReopenReason | string
  reasonDetail: string | null | undefined
  actorUserId: string
  referenceDate?: Date
}

export interface ReopenPayrollPeriodResult {
  auditId: string
  periodId: string
  periodStatus: Extract<PeriodStatus, 'reopened'>
  operationalMonth: string
  previousStatus: PeriodStatus
  reason: ReopenReason
  reopenedAt: string
}

const buildAuditId = () => `reopen-audit-${randomUUID()}`

const formatOperationalMonthDate = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, '0')}-01`

/**
 * Reopens an exported payroll period for reliquidación.
 *
 * Atomic flow (single transaction):
 *   1. Validate reason taxonomy.
 *   2. Lock the period row (FOR UPDATE NOWAIT) and load snapshot.
 *   3. Assert period is in 'exported' state.
 *   4. Assert reopen window (current operational month only).
 *   5. UPDATE payroll_periods SET status = 'reopened'.
 *   6. INSERT payroll_period_reopen_audit row.
 *   7. COMMIT.
 *
 * Failure modes:
 *   - Invalid reason → 400.
 *   - Period not found → 404.
 *   - Period not exported → 409.
 *   - Period outside operational window → 409.
 *   - Concurrent lock (another export in flight) → 409 via FOR UPDATE NOWAIT.
 */
export const reopenPayrollPeriod = async (
  input: ReopenPayrollPeriodInput
): Promise<ReopenPayrollPeriodResult> => {
  const actorUserId = input.actorUserId?.trim()

  if (!actorUserId) {
    throw new PayrollValidationError('Reopen requires an authenticated actor user id.', 401)
  }

  const periodId = input.periodId?.trim()

  if (!periodId) {
    throw new PayrollValidationError('periodId is required.', 400)
  }

  const { reason, reasonDetail } = assertValidReopenReason(input.reason, input.reasonDetail ?? null)
  const referenceDate = input.referenceDate ?? new Date()
  const auditId = buildAuditId()
  const lockedAt = new Date().toISOString()

  return withTransaction(async client => {
    // 1 & 2 — load the period under FOR UPDATE NOWAIT lock.
    let snapshot

    try {
      snapshot = await assertNoExportInProgress(periodId, client)
    } catch (error) {
      // Postgres raises "could not obtain lock on row" with code 55P03 when
      // the row is held by another transaction. Surface that as 409.
      if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === '55P03') {
        throw new PayrollValidationError(
          'El período está siendo procesado por otra operación. Intenta nuevamente en unos segundos.',
          409
        )
      }

      throw error
    }

    // 3 — period must be in 'exported' state.
    assertPeriodReopenable(snapshot)

    // 4 — period must be within the reopen window (days since exported_at).
    assertReopenWindow(snapshot, referenceDate)

    // 5 — transition status.
    await client.query(
      `
        UPDATE greenhouse_payroll.payroll_periods
        SET status = 'reopened', updated_at = CURRENT_TIMESTAMP
        WHERE period_id = $1
      `,
      [periodId]
    )

    // 6 — insert audit row.
    const previredSnapshot = checkPreviredDeclaredSnapshot(periodId)
    const operationalMonth = formatOperationalMonthDate(snapshot.year, snapshot.month)

    const { rows: auditRows } = await client.query<{ audit_id: string; reopened_at: Date }>(
      `
        INSERT INTO greenhouse_payroll.payroll_period_reopen_audit (
          audit_id,
          period_id,
          reopened_by_user_id,
          reason,
          reason_detail,
          previred_declared_check,
          operational_month,
          previous_status,
          locked_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING audit_id, reopened_at
      `,
      [
        auditId,
        periodId,
        actorUserId,
        reason,
        reasonDetail,
        previredSnapshot,
        operationalMonth,
        snapshot.status,
        lockedAt
      ]
    )

    const auditRow = auditRows[0]

    if (!auditRow) {
      throw new PayrollValidationError('Failed to record payroll reopen audit.', 500)
    }

    return {
      auditId: auditRow.audit_id,
      periodId,
      periodStatus: 'reopened',
      operationalMonth,
      previousStatus: snapshot.status,
      reason,
      reopenedAt:
        auditRow.reopened_at instanceof Date ? auditRow.reopened_at.toISOString() : String(auditRow.reopened_at)
    }
  })
}

/**
 * Reads the currently-active reopen audit row for a period (if any).
 * Used by the recalculate flow to link newly-created v2 entries back to
 * the audit row that justified them, and by the admin views that show
 * reopen history per period.
 */
export const getActiveReopenAuditForPeriod = async (periodId: string) => {
  const { query } = await import('@/lib/db')

  const rows = await query<{
    audit_id: string
    period_id: string
    reopened_by_user_id: string
    reopened_at: Date | string
    reason: ReopenReason
    reason_detail: string | null
    previred_declared_check: boolean
    operational_month: Date | string
    previous_status: PeriodStatus
  }>(
    `
      SELECT audit_id, period_id, reopened_by_user_id, reopened_at, reason, reason_detail,
             previred_declared_check, operational_month, previous_status
      FROM greenhouse_payroll.payroll_period_reopen_audit
      WHERE period_id = $1
      ORDER BY reopened_at DESC
      LIMIT 1
    `,
    [periodId]
  )

  return rows[0] ?? null
}
