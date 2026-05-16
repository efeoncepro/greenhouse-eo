import { NextResponse } from 'next/server'

import { calculatePayroll } from '@/lib/payroll/calculate-payroll'
import {
  FORCE_RECOMPUTE_MIN_REASON_CHARS,
  PayrollForceRecomputeAuditError,
  recordPayrollForceRecomputeAudit
} from '@/lib/payroll/force-recompute-audit'
import { isPayrollParticipationWindowEnabled } from '@/lib/payroll/participation-window'
import { PayrollValidationError } from '@/lib/payroll/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { can } from '@/lib/entitlements/runtime'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-893 V1.1 / TASK-895 — Admin endpoint canonical para `force_recompute`
 * de un payroll period bajo flag `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true`
 * cuando los guards canonicos TASK-893 (BL-5 reopened, BL-2 single-member)
 * bloquean recompute legitimo.
 *
 * Flujo canonical:
 * 1. Auth: `requireAdminTenantContext` + `can(tenant, 'payroll.period.force_recompute', 'execute', 'tenant')`.
 * 2. Body validation: `reason` requerido, `>= 20 chars` (helper enforce DB-side
 *    tambien via CHECK constraint).
 * 3. Hard guard: el endpoint SOLO actua cuando `isPayrollParticipationWindowEnabled() === true`.
 *    Bajo flag OFF, el recompute regular pasa por `/api/hr/payroll/periods/[periodId]/calculate`
 *    sin necesidad de este endpoint.
 * 4. Insert audit row append-only en `member_payroll_force_recompute_audit_log`
 *    con flag snapshot + reason + actor.
 * 5. Invoke `calculatePayroll({ forceRecomputeReason: reason })` que bypasa el
 *    BL-5 guard cuando reason valida.
 * 6. Return audit row + result summary.
 *
 * Idempotente: re-llamar con misma periodId + reason crea otra audit row +
 * re-corre calculatePayroll. Si el periodo ya esta `calculated` post-recompute,
 * la operacion es idempotente en payroll_entries (mismo gross_total).
 *
 * Capability granular: `payroll.period.force_recompute` (EFEONCE_ADMIN +
 * FINANCE_ADMIN solo). Reason minimo 20 chars.
 *
 * Spec: TASK-893 ADR + TASK-895 migration.
 */

interface ForceRecomputeBody {
  reason?: unknown
}

interface ForceRecomputeResponse {
  forceRecompute: {
    auditId: string
    targetPeriodId: string
    actorUserId: string
    reason: string
    flagStateSnapshot: Record<string, unknown>
    effectiveAt: string
  }
  calculation: {
    periodId: string
    entryCount: number
    recalculatedAt: string
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ periodId: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!can(tenant, 'payroll.period.force_recompute', 'execute', 'tenant')) {
    return NextResponse.json(
      {
        error: 'No tienes permiso para forzar el recompute del periodo payroll.',
        code: 'forbidden',
        actionable: false
      },
      { status: 403 }
    )
  }

  const { periodId } = await params

  if (!periodId || typeof periodId !== 'string') {
    return NextResponse.json(
      {
        error: 'periodId requerido en la ruta.',
        code: 'validation_error',
        actionable: false
      },
      { status: 400 }
    )
  }

  if (!isPayrollParticipationWindowEnabled()) {
    /*
     * Bajo flag OFF, los guards TASK-893 NO disparan. El force_recompute
     * endpoint solo tiene sentido bajo flag ON. Rechazo explicito evita
     * audit rows sin sentido contextual + le indica al operador que use el
     * endpoint regular `/api/hr/payroll/periods/[periodId]/calculate`.
     */
    return NextResponse.json(
      {
        error: 'Force recompute solo aplica cuando PAYROLL_PARTICIPATION_WINDOW_ENABLED=true. Usa el endpoint regular `/api/hr/payroll/periods/[periodId]/calculate`.',
        code: 'flag_disabled_force_recompute_not_applicable',
        actionable: true
      },
      { status: 409 }
    )
  }

  let body: ForceRecomputeBody

  try {
    body = (await request.json().catch(() => ({}))) as ForceRecomputeBody
  } catch {
    body = {}
  }

  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

  if (reason.length < FORCE_RECOMPUTE_MIN_REASON_CHARS) {
    return NextResponse.json(
      {
        error: `reason debe tener al menos ${FORCE_RECOMPUTE_MIN_REASON_CHARS} caracteres (recibido: ${reason.length}).`,
        code: 'reason_too_short',
        actionable: true
      },
      { status: 400 }
    )
  }

  const actorUserId = tenant.userId

  if (!actorUserId) {
    return NextResponse.json(
      {
        error: 'Actor user ID requerido para audit row.',
        code: 'actor_required',
        actionable: false
      },
      { status: 401 }
    )
  }

  try {
    // 1. Record audit row FIRST (fail-loud si la insercion no pasa CHECK).
    const auditRow = await recordPayrollForceRecomputeAudit({
      targetKind: 'period',
      targetPeriodId: periodId,
      actorUserId,
      actorEmail: null,
      reason,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      metadata: {
        endpoint: 'admin.hr.payroll.periods.force_recompute',
        ts: new Date().toISOString()
      }
    })

    // 2. Invoke calculatePayroll con forceRecomputeReason (bypassa BL-5 guard).
    const result = await calculatePayroll({
      periodId,
      actorIdentifier: actorUserId,
      forceRecomputeReason: reason
    })

    const response: ForceRecomputeResponse = {
      forceRecompute: {
        auditId: auditRow.auditId,
        targetPeriodId: periodId,
        actorUserId,
        reason: auditRow.reason,
        flagStateSnapshot: auditRow.flagStateSnapshot,
        effectiveAt: auditRow.effectiveAt
      },
      calculation: {
        periodId: result.period.periodId,
        entryCount: result.entries.length,
        recalculatedAt: new Date().toISOString()
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (err) {
    if (err instanceof PayrollForceRecomputeAuditError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          actionable: err.code === 'reason_too_short' || err.code === 'actor_required'
        },
        { status: err.statusCode }
      )
    }

    if (err instanceof PayrollValidationError) {
      return NextResponse.json(
        {
          error: err.message,
          code:
            err.details && typeof err.details === 'object' && 'code' in err.details
              ? String((err.details as { code: unknown }).code)
              : 'payroll_validation_error',
          actionable: false,
          details: err.details ?? null
        },
        { status: err.statusCode }
      )
    }

    captureWithDomain(err, 'payroll', {
      extra: {
        source: 'admin.hr.payroll.force_recompute.failed',
        periodId,
        actorUserId
      }
    })

    return NextResponse.json(
      {
        error: 'Force recompute fallo.',
        code: 'internal_error',
        actionable: true,
        details: redactErrorForResponse(err)
      },
      { status: 500 }
    )
  }
}
