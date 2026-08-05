import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { query } from '@/lib/db'
import {
  PayrollAdjustmentValidationError,
  approveAdjustment,
  revertAdjustment
} from '@/lib/payroll/adjustments/apply-adjustment'
import {
  assertAdjustmentPeriodWritable,
  recalculateAfterAdjustment
} from '@/lib/payroll/adjustments/recalculate-adjustment'
import { requireHrTenantContext } from '@/lib/tenant/authorization'
import { ROLE_CODES } from '@/config/role-codes'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ entryId: string; adjustmentId: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Maker-checker: solo efeonce_admin aprueba (capability `hr.payroll_adjustments_approval` default).
  const canApprove = tenant.roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN)

  if (!canApprove) {
    return NextResponse.json({ error: 'No autorizado para aprobar ajustes de nomina.' }, { status: 403 })
  }

  try {
    const { entryId, adjustmentId } = await params
    const session = await getServerAuthSession()
    const userId = session?.user?.id ?? tenant.userId

    const entryRows = await query<{ period_id: string }>(
      'SELECT period_id FROM greenhouse_payroll.payroll_entries WHERE entry_id = $1 LIMIT 1',
      [entryId]
    )

    const periodId = entryRows[0]?.period_id

    if (!periodId) throw new PayrollAdjustmentValidationError('Payroll entry no encontrada.', 404)

    await assertAdjustmentPeriodWritable(periodId)

    const adjustment = await approveAdjustment({ adjustmentId, approverUserId: userId })

    // TASK-745c — auto-recalc tras aprobacion: el adjustment pasa de
    // pending_approval a active y debe reflejarse en el neto del entry.
    let recalculated = false

    try {
      await recalculateAfterAdjustment({
        entryId,
        periodId: adjustment.periodId,
        actorIdentifier: userId
      })
      recalculated = true
    } catch (recalcError) {
      await revertAdjustment({
        adjustmentId,
        revertedByUserId: userId,
        revertedReason: 'Aprobacion sin materializacion; requiere reintento controlado.'
      }).catch(revertError => {
        console.error(`[adjustments approve] failed to compensate ${adjustmentId}`, revertError)
      })

      console.warn(
        `[adjustments approve] auto-recalc failed for entry ${entryId}:`,
        recalcError instanceof Error ? recalcError.message : recalcError
      )

      if (recalcError instanceof PayrollAdjustmentValidationError) throw recalcError

      return NextResponse.json(
        {
          error: 'El ajuste fue aprobado pero no pudo materializarse; quedó revertido. Corrige el bloqueo y reintenta.',
          code: 'payroll_adjustment_recalculation_failed'
        },
        { status: 409 }
      )
    }

    return NextResponse.json({ adjustment, approved: true, recalculated })
  } catch (error) {
    if (error instanceof PayrollAdjustmentValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('POST /adjustments/approve failed', error)

    return NextResponse.json({ error: 'No fue posible aprobar el ajuste.' }, { status: 500 })
  }
}
