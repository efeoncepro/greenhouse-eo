import { NextResponse } from 'next/server'

import { cancelFinalSettlementForCase } from '@/lib/payroll/final-settlement'
import { assertHrEntitlement, requireHrCoreManageTenantContext } from '@/lib/hr-core/shared'
import { PayrollValidationError } from '@/lib/payroll/shared'

export const dynamic = 'force-dynamic'

const toFinalSettlementErrorResponse = (error: unknown, fallbackMessage: string) => {
  if (error instanceof PayrollValidationError) {
    return NextResponse.json({ error: error.message, details: error.details ?? null }, { status: error.statusCode })
  }

  console.error(fallbackMessage, error)

  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}

export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertHrEntitlement({
      tenant,
      capability: 'hr.final_settlement',
      action: 'manage',
      scope: 'tenant'
    })

    const body = (await request.json().catch(() => null)) as { reason?: string | null } | null
    const { caseId } = await context.params

    const settlement = await cancelFinalSettlementForCase({
      offboardingCaseId: caseId,
      actorUserId: tenant.userId,
      reason: body?.reason ?? ''
    })

    return NextResponse.json({ settlement })
  } catch (error) {
    return toFinalSettlementErrorResponse(error, 'Unable to cancel final settlement.')
  }
}
