import { NextResponse } from 'next/server'

import { assertHrEntitlement, requireHrCoreManageTenantContext } from '@/lib/hr-core/shared'
import { issueFinalSettlementDocumentForCase } from '@/lib/payroll/final-settlement'
import { PayrollValidationError } from '@/lib/payroll/shared'

export const dynamic = 'force-dynamic'

const toResponse = (error: unknown, fallbackMessage: string) => {
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
    assertHrEntitlement({ tenant, capability: 'hr.final_settlement_document', action: 'manage', scope: 'tenant' })
    const { caseId } = await context.params
    const document = await issueFinalSettlementDocumentForCase({ offboardingCaseId: caseId, actorUserId: tenant.userId })

    return NextResponse.json({ document })
  } catch (error) {
    return toResponse(error, 'Unable to issue final settlement document.')
  }
}
