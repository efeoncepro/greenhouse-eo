import { NextResponse } from 'next/server'

import { ContractorEngagementValidationError } from '@/lib/contractor-engagements/errors'
import { prepareMonthlyContractorPaymentRun } from '@/lib/contractor-engagements/payables/monthly-run'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-979 — trigger manual de la corrida mensual de pago a contractors.
 *
 * POST body: { periodYear: number, periodMonth: 1-12, dryRun?: boolean }
 *
 * `dryRun: true` devuelve el preview (cuántos payables entran + total neto por
 * moneda) SIN mutar nada. Sin `dryRun`, prepara las payment orders agrupadas por
 * moneda en `pending_approval` (NO paga — la aprobación + el mark-paid son humanos)
 * e idempotente (re-correr no duplica). Capability `finance.contractor_payable:manage`
 * (reusa la capability de gestión de payables; no requiere capability nueva).
 */
const isValidYear = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 2020 && value <= 2100

const isValidMonth = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 12

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!can(tenant, 'finance.contractor_payable', 'manage', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const payload = (body ?? {}) as Record<string, unknown>

  if (!isValidYear(payload.periodYear)) {
    return NextResponse.json(
      { error: 'periodYear debe ser un año válido (2020-2100).', code: 'invalid_period_year' },
      { status: 422 }
    )
  }

  if (!isValidMonth(payload.periodMonth)) {
    return NextResponse.json(
      { error: 'periodMonth debe ser un mes válido (1-12).', code: 'invalid_period_month' },
      { status: 422 }
    )
  }

  const dryRun = payload.dryRun === true

  try {
    const result = await prepareMonthlyContractorPaymentRun({
      periodYear: payload.periodYear,
      periodMonth: payload.periodMonth,
      triggeredByUserId: tenant.userId ?? 'unknown',
      triggerSource: 'manual',
      dryRun
    })

    return NextResponse.json({ run: result })
  } catch (error) {
    if (error instanceof ContractorEngagementValidationError) {
      return NextResponse.json(
        { error: error.message, code: error.code, ...(error.details ?? {}) },
        { status: error.statusCode }
      )
    }

    captureWithDomain(error, 'finance', {
      tags: { source: 'contractor_payables_monthly_run_api', stage: dryRun ? 'preview' : 'prepare' }
    })

    return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
  }
}
