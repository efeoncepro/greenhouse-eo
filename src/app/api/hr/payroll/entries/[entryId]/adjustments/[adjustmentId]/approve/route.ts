import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import {
  PayrollAdjustmentValidationError,
  approveAdjustment
} from '@/lib/payroll/adjustments/apply-adjustment'
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
    return NextResponse.json(
      { error: 'No autorizado para aprobar ajustes de nomina.' },
      { status: 403 }
    )
  }

  try {
    const { adjustmentId } = await params
    const session = await getServerAuthSession()
    const userId = session?.user?.id ?? tenant.userId
    const adjustment = await approveAdjustment({ adjustmentId, approverUserId: userId })

    return NextResponse.json({ adjustment, approved: true })
  } catch (error) {
    if (error instanceof PayrollAdjustmentValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    console.error('POST /adjustments/approve failed', error)

    return NextResponse.json({ error: 'No fue posible aprobar el ajuste.' }, { status: 500 })
  }
}
