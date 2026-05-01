import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { getPayrollPaymentStatusForPeriod } from '@/lib/finance/payment-orders/payroll-status-reader'

export const dynamic = 'force-dynamic'

/**
 * TASK-751 — read-only del estado downstream de pago para un periodo Payroll.
 *
 * GET /api/admin/finance/payment-orders/payroll-status?periodId=PAY-2026-04
 */
export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const periodId = searchParams.get('periodId')

  if (!periodId) {
    return NextResponse.json({ error: 'periodId es requerido' }, { status: 400 })
  }

  try {
    const summary = await getPayrollPaymentStatusForPeriod(periodId)

    return NextResponse.json(summary)
  } catch (error) {
    console.error(`GET payroll-status periodId=${periodId} failed`, error)

    return NextResponse.json(
      { error: 'No fue posible cargar el estado downstream del periodo.' },
      { status: 500 }
    )
  }
}
