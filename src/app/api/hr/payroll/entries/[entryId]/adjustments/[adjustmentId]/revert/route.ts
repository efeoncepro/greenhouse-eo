import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { PayrollAdjustmentValidationError, revertAdjustment } from '@/lib/payroll/adjustments/apply-adjustment'
import {
  assertAdjustmentPeriodWritable,
  recalculateAfterAdjustment
} from '@/lib/payroll/adjustments/recalculate-adjustment'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ entryId: string; adjustmentId: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { entryId, adjustmentId } = await params
    const session = await getServerAuthSession()
    const userId = session?.user?.id ?? tenant.userId

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    const revertedReason = String(body?.revertedReason ?? '').trim()

    if (revertedReason.length < 5) {
      return NextResponse.json({ error: 'Indica el motivo de la reversion (min 5 caracteres).' }, { status: 400 })
    }

    const entryRows = await query<{ period_id: string }>(
      'SELECT period_id FROM greenhouse_payroll.payroll_entries WHERE entry_id = $1 LIMIT 1',
      [entryId]
    )

    const periodId = entryRows[0]?.period_id

    if (!periodId) throw new PayrollAdjustmentValidationError('Payroll entry no encontrada.', 404)

    await assertAdjustmentPeriodWritable(periodId)

    const adjustment = await revertAdjustment({
      adjustmentId,
      revertedByUserId: userId,
      revertedReason
    })

    // TASK-745c — auto-recalc tras revert: el adjustment dejo de aplicar,
    // el entry vuelve al estado natural sin ese descuento/factor.
    let recalculated = false

    try {
      await recalculateAfterAdjustment({
        entryId,
        periodId,
        actorIdentifier: userId
      })
      recalculated = true
    } catch (recalcError) {
      console.warn(
        `[adjustments revert] auto-recalc failed for entry ${entryId}:`,
        recalcError instanceof Error ? recalcError.message : recalcError
      )

      return NextResponse.json(
        {
          error:
            'La reversión quedó registrada, pero la nómina no pudo recalcularse. Ejecuta el cálculo del período antes de continuar.',
          code: 'payroll_adjustment_recalculation_failed'
        },
        { status: 409 }
      )
    }

    return NextResponse.json({ adjustment, reverted: true, recalculated })
  } catch (error) {
    if (error instanceof PayrollAdjustmentValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('POST /adjustments/revert failed', error)

    return NextResponse.json({ error: 'No fue posible revertir el ajuste.' }, { status: 500 })
  }
}
