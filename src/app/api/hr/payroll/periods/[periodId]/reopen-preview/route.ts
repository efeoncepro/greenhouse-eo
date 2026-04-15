import { NextResponse } from 'next/server'

import { ROLE_CODES } from '@/config/role-codes'
import { getOperationalPayrollMonth } from '@/lib/calendar/operational-calendar'
import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { getActiveReopenAuditForPeriod } from '@/lib/payroll/reopen-period'
import { PayrollValidationError } from '@/lib/payroll/shared'
import { hasRoleCode, requireHrTenantContext } from '@/lib/tenant/authorization'
import type { PeriodStatus } from '@/types/payroll'

// TASK-412 — GET /api/hr/payroll/periods/[periodId]/reopen-preview
//
// Dry-run preview of the reopen eligibility checks. Returns the same
// information the UI needs to decide whether the "Reabrir nómina" action
// should be enabled and to show the reasons behind the decision. Does NOT
// mutate any state.

export const dynamic = 'force-dynamic'

type ReopenPreviewReason = {
  code: string
  blocking: boolean
  message: string
}

interface ReopenPreviewResponse {
  canReopen: boolean
  reasons: ReopenPreviewReason[]
  currentStatus: PeriodStatus
  operationalYear: number
  operationalMonth: number
  inWindow: boolean
  entriesCount: number
  alreadyReopened: boolean
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ periodId: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!hasRoleCode(tenant, ROLE_CODES.EFEONCE_ADMIN)) {
    return NextResponse.json(
      { error: 'Solo usuarios con rol efeonce_admin pueden previsualizar la reapertura.' },
      { status: 403 }
    )
  }

  try {
    const { periodId } = await params
    const period = await getPayrollPeriod(periodId)

    if (!period) {
      throw new PayrollValidationError(`Período de nómina ${periodId} no existe.`, 404)
    }

    const operational = getOperationalPayrollMonth(new Date())

    const inWindow =
      operational.operationalYear === period.year && operational.operationalMonth === period.month

    const entries = await getPayrollEntries(periodId)
    const existingAudit = await getActiveReopenAuditForPeriod(periodId)
    const alreadyReopened = period.status === 'reopened' || existingAudit !== null

    const reasons: ReopenPreviewReason[] = []

    // Status check — only `exported` periods can be reopened.
    if (period.status === 'exported') {
      reasons.push({
        code: 'status_exported',
        blocking: false,
        message: 'La nómina está en estado exportada y puede reabrirse.'
      })
    } else if (period.status === 'reopened') {
      reasons.push({
        code: 'status_reopened',
        blocking: true,
        message: 'La nómina ya fue reabierta. Recalcula los cambios y vuelve a cerrarla para exportar una v2.'
      })
    } else {
      reasons.push({
        code: 'status_not_exported',
        blocking: true,
        message: `Solo las nóminas exportadas pueden reabrirse. Estado actual: ${period.status}.`
      })
    }

    // Operational window check — the period must be the current operational month.
    if (inWindow) {
      reasons.push({
        code: 'window_current',
        blocking: false,
        message: `El período corresponde al mes operativo vigente (${operational.operationalYear}-${String(operational.operationalMonth).padStart(2, '0')}).`
      })
    } else {
      reasons.push({
        code: 'window_out_of_range',
        blocking: true,
        message: `Solo se puede reabrir el período del mes operativo vigente (${operational.operationalYear}-${String(operational.operationalMonth).padStart(2, '0')}). Para meses anteriores registra un ajuste en el período actual.`
      })
    }

    // Prior audit check — surface as non-blocking warning.
    if (existingAudit && period.status === 'exported') {
      reasons.push({
        code: 'prior_reopen_audit',
        blocking: false,
        message: 'Esta nómina ya tiene una reapertura previa registrada. Una nueva reapertura generará otra versión.'
      })
    }

    const canReopen = reasons.every(reason => !reason.blocking)

    const payload: ReopenPreviewResponse = {
      canReopen,
      reasons,
      currentStatus: period.status,
      operationalYear: operational.operationalYear,
      operationalMonth: operational.operationalMonth,
      inWindow,
      entriesCount: entries.length,
      alreadyReopened
    }

    return NextResponse.json(payload)
  } catch (error) {
    return toPayrollErrorResponse(error, 'No se pudo calcular el preview de reapertura.')
  }
}
