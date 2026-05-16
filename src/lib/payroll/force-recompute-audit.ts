import 'server-only'

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { isPayrollExitEligibilityWindowEnabled } from './exit-eligibility'
import { isPayrollParticipationWindowEnabled } from './participation-window'

/**
 * TASK-893 V1.1 / TASK-895 — Force recompute audit helper canonical.
 *
 * Records an audit row in `greenhouse_core.member_payroll_force_recompute_audit_log`
 * when an operator with capability `payroll.period.force_recompute` overrides
 * one of the canonical TASK-893 guards (BL-2 single-member recalc or BL-5
 * reopened period recompute) under flag `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true`.
 *
 * **Append-only**: the audit table has anti-UPDATE/anti-DELETE triggers.
 * Corrections must be a new row with `metadata_json.correction_of=<audit_id>`.
 *
 * **Reason validation**: `>= 20 chars` enforced both at CHECK constraint
 * (DB) and in this helper (TS). The bar is the same as TASK-893's
 * cross-domain drift reconciliation (TASK-891 force_recompute analog).
 *
 * **Flag snapshot**: captures the env flag state at write time so forensic
 * review can reconstruct "what flags were on when this override happened?".
 *
 * Pure helper. Caller is responsible for capability check (`can(subject,
 * 'payroll.period.force_recompute', 'execute', 'tenant')`) BEFORE invoking.
 * This helper records the override; it does NOT authorize it.
 */
export type RecordPayrollForceRecomputeAuditInput =
  | {
      targetKind: 'period'
      targetPeriodId: string
      actorUserId: string
      actorEmail?: string | null
      reason: string
      ipAddress?: string | null
      userAgent?: string | null
      metadata?: Record<string, unknown>
    }
  | {
      targetKind: 'entry'
      targetEntryId: string
      targetMemberId: string
      targetPeriodId?: string | null
      actorUserId: string
      actorEmail?: string | null
      reason: string
      ipAddress?: string | null
      userAgent?: string | null
      metadata?: Record<string, unknown>
    }

export type PayrollForceRecomputeAuditRow = {
  auditId: string
  targetKind: 'period' | 'entry'
  targetPeriodId: string | null
  targetEntryId: string | null
  targetMemberId: string | null
  actorUserId: string
  reason: string
  flagStateSnapshot: Record<string, unknown>
  effectiveAt: string
  createdAt: string
}

const MIN_REASON_CHARS = 20

export class PayrollForceRecomputeAuditError extends Error {
  statusCode: number
  code: string

  constructor(message: string, code: string, statusCode = 400) {
    super(message)
    this.name = 'PayrollForceRecomputeAuditError'
    this.code = code
    this.statusCode = statusCode
  }
}

/**
 * Snapshot of the participation-related flag state at audit write time.
 * Lets future forensic review tell whether the override happened pre-flag-flip
 * or post-flag-flip without having to cross-reference deploy logs.
 */
const buildFlagStateSnapshot = (): Record<string, unknown> => ({
  PAYROLL_PARTICIPATION_WINDOW_ENABLED: isPayrollParticipationWindowEnabled(),
  PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED: isPayrollExitEligibilityWindowEnabled(),
  capturedAt: new Date().toISOString()
})

const INSERT_AUDIT_SQL = `
  INSERT INTO greenhouse_core.member_payroll_force_recompute_audit_log (
    audit_id,
    target_kind,
    target_period_id,
    target_entry_id,
    target_member_id,
    actor_user_id,
    actor_email,
    reason,
    flag_state_snapshot,
    effective_at,
    ip_address,
    user_agent,
    metadata_json
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW(), $10, $11, $12::jsonb)
  RETURNING
    audit_id,
    target_kind,
    target_period_id,
    target_entry_id,
    target_member_id,
    actor_user_id,
    reason,
    flag_state_snapshot,
    effective_at,
    created_at
`

type DbRow = {
  audit_id: string
  target_kind: 'period' | 'entry'
  target_period_id: string | null
  target_entry_id: string | null
  target_member_id: string | null
  actor_user_id: string
  reason: string
  flag_state_snapshot: Record<string, unknown> | string
  effective_at: string | Date
  created_at: string | Date
}

const normalizeTimestamp = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : value

const normalizeFlagSnapshot = (value: Record<string, unknown> | string): Record<string, unknown> =>
  typeof value === 'string' ? (JSON.parse(value) as Record<string, unknown>) : value

export const recordPayrollForceRecomputeAudit = async (
  input: RecordPayrollForceRecomputeAuditInput
): Promise<PayrollForceRecomputeAuditRow> => {
  const reason = input.reason?.trim() ?? ''

  if (reason.length < MIN_REASON_CHARS) {
    throw new PayrollForceRecomputeAuditError(
      `reason must be at least ${MIN_REASON_CHARS} chars (got ${reason.length}).`,
      'reason_too_short'
    )
  }

  if (!input.actorUserId) {
    throw new PayrollForceRecomputeAuditError('actor_user_id is required.', 'actor_required')
  }

  const auditId = randomUUID()
  const flagStateSnapshot = buildFlagStateSnapshot()
  const metadata = input.metadata ?? {}

  const targetKind = input.targetKind

  const targetPeriodId =
    targetKind === 'period'
      ? input.targetPeriodId
      : (input as Extract<RecordPayrollForceRecomputeAuditInput, { targetKind: 'entry' }>).targetPeriodId ?? null

  const targetEntryId =
    targetKind === 'entry'
      ? (input as Extract<RecordPayrollForceRecomputeAuditInput, { targetKind: 'entry' }>).targetEntryId
      : null

  const targetMemberId =
    targetKind === 'entry'
      ? (input as Extract<RecordPayrollForceRecomputeAuditInput, { targetKind: 'entry' }>).targetMemberId
      : null

  const rows = await runGreenhousePostgresQuery<DbRow>(INSERT_AUDIT_SQL, [
    auditId,
    targetKind,
    targetPeriodId,
    targetEntryId,
    targetMemberId,
    input.actorUserId,
    input.actorEmail ?? null,
    reason,
    JSON.stringify(flagStateSnapshot),
    input.ipAddress ?? null,
    input.userAgent ?? null,
    JSON.stringify(metadata)
  ])

  const row = rows[0]

  if (!row) {
    throw new PayrollForceRecomputeAuditError(
      'Failed to insert force_recompute audit row.',
      'insert_failed',
      500
    )
  }

  return {
    auditId: row.audit_id,
    targetKind: row.target_kind,
    targetPeriodId: row.target_period_id,
    targetEntryId: row.target_entry_id,
    targetMemberId: row.target_member_id,
    actorUserId: row.actor_user_id,
    reason: row.reason,
    flagStateSnapshot: normalizeFlagSnapshot(row.flag_state_snapshot),
    effectiveAt: normalizeTimestamp(row.effective_at),
    createdAt: normalizeTimestamp(row.created_at)
  }
}

export const FORCE_RECOMPUTE_MIN_REASON_CHARS = MIN_REASON_CHARS
