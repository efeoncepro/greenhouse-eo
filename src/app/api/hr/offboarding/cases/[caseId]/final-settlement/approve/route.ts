import { NextResponse } from 'next/server'

import { approveFinalSettlementForCase } from '@/lib/payroll/final-settlement'
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

export async function POST(_request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertHrEntitlement({
      tenant,
      capability: 'hr.final_settlement',
      action: 'approve',
      scope: 'tenant'
    })

    const { caseId } = await context.params

    const settlement = await approveFinalSettlementForCase({
      offboardingCaseId: caseId,
      actorUserId: tenant.userId
    })

    return NextResponse.json({ settlement })
  } catch (error) {
    return toFinalSettlementErrorResponse(error, 'Unable to approve final settlement.')
  }
}
