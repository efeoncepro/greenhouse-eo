import { NextResponse } from 'next/server'

import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { materializePayrollObligationsForExportedPeriod } from '@/lib/finance/payment-obligations/materialize-payroll'

export const dynamic = 'force-dynamic'

/**
 * Admin manual trigger: re-materializa las payment_obligations de un
 * periodo Payroll. Usa `reconcilePaymentObligation` debajo, asi que
 * obligations existentes con drift se autosaneran (supersede atomic).
 *
 * Util cuando:
 *   - Cambia la formula de calculo (ej. Previred ahora suma empleado +
 *     empleador completo) y necesitamos re-aplicar a periods historicos.
 *   - El reactive worker quedo dead y queremos forzar el procesamiento
 *     sin esperar al cron.
 *   - Drift detectado en data quality que requiere healing.
 *
 * POST /api/admin/finance/payment-obligations/materialize-period
 * Body: { periodId: string, year: number, month: number }
 */
export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const periodId = body?.periodId
    const year = Number(body?.year)
    const month = Number(body?.month)

    if (typeof periodId !== 'string' || !periodId) {
      return NextResponse.json({ error: 'periodId requerido (string)' }, { status: 400 })
    }

    if (!Number.isInteger(year) || year < 2020 || year > 2100) {
      return NextResponse.json({ error: 'year invalido' }, { status: 400 })
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'month invalido (1-12)' }, { status: 400 })
    }

    const result = await materializePayrollObligationsForExportedPeriod({ periodId, year, month })

    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error('POST materialize-period failed', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No fue posible materializar el periodo.' },
      { status: 500 }
    )
  }
}
