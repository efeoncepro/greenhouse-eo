import { NextResponse } from 'next/server'

import { ROLE_CODES } from '@/config/role-codes'
import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { toPayrollErrorResponse } from '@/lib/payroll/api-response'
import { getActiveReopenAuditForPeriod } from '@/lib/payroll/reopen-period'
import { evaluateReopenWindow, resolveReopenWindowDays } from '@/lib/payroll/reopen-guards'
import { PayrollValidationError } from '@/lib/payroll/shared'
import { hasRoleCode, requireHrTenantContext } from '@/lib/tenant/authorization'
import type { PeriodStatus } from '@/types/payroll'

// TASK-412 — GET /api/hr/payroll/periods/[periodId]/reopen-preview
// Hotfix 2026-04-15 — ventana basada en `exported_at` + días configurables
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
  windowDays: number
  daysSinceExport: number | null
  exportedAt: string | null
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

    const windowDays = resolveReopenWindowDays()
    const windowEval = evaluateReopenWindow({ exported_at: period.exportedAt }, new Date(), windowDays)

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

    // Reopen window check — days since exported_at <= windowDays.
    if (windowEval.reason === 'ok') {
      const rounded = Math.round(windowEval.daysSinceExport ?? 0)

      reasons.push({
        code: 'window_ok',
        blocking: false,
        message: `La nómina fue exportada hace ${rounded} día(s). Dentro del rango permitido (${windowDays} días).`
      })
    } else if (windowEval.reason === 'not_exported') {
      reasons.push({
        code: 'window_not_exported',
        blocking: true,
        message: 'La nómina no tiene fecha de exportación registrada.'
      })
    } else {
      const rounded = Math.round(windowEval.daysSinceExport ?? 0)

      reasons.push({
        code: 'window_out_of_range',
        blocking: true,
        message: `La nómina fue exportada hace ${rounded} día(s). Excede los ${windowDays} días permitidos. Registra un ajuste retroactivo en el período actual.`
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
      windowDays,
      daysSinceExport: windowEval.daysSinceExport,
      exportedAt: windowEval.exportedAt,
      inWindow: windowEval.withinWindow,
      entriesCount: entries.length,
      alreadyReopened
    }

    return NextResponse.json(payload)
  } catch (error) {
    return toPayrollErrorResponse(error, 'No se pudo calcular el preview de reapertura.')
  }
}
