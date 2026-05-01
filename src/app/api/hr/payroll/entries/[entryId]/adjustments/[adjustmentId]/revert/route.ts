import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import {
  PayrollAdjustmentValidationError,
  revertAdjustment
} from '@/lib/payroll/adjustments/apply-adjustment'
import { requireHrTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ entryId: string; adjustmentId: string }> }
) {
  const { tenant, errorResponse } = await requireHrTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { adjustmentId } = await params
    const session = await getServerAuthSession()
    const userId = session?.user?.id ?? tenant.userId

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    const revertedReason = String(body?.revertedReason ?? '').trim()

    if (revertedReason.length < 5) {
      return NextResponse.json(
        { error: 'Indica el motivo de la reversion (min 5 caracteres).' },
        { status: 400 }
      )
    }

    const adjustment = await revertAdjustment({
      adjustmentId,
      revertedByUserId: userId,
      revertedReason
    })

    return NextResponse.json({ adjustment, reverted: true })
  } catch (error) {
    if (error instanceof PayrollAdjustmentValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('POST /adjustments/revert failed', error)

    return NextResponse.json({ error: 'No fue posible revertir el ajuste.' }, { status: 500 })
  }
}
