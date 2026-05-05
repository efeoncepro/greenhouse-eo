import { NextResponse } from 'next/server'

import { assertHrEntitlement, requireHrCoreManageTenantContext } from '@/lib/hr-core/shared'
import { renderFinalSettlementDocumentForCase } from '@/lib/payroll/final-settlement'
import { PayrollValidationError } from '@/lib/payroll/shared'

export const dynamic = 'force-dynamic'

const toResponse = (error: unknown, fallbackMessage: string) => {
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
      capability: 'hr.final_settlement_document',
      action: 'manage',
      scope: 'tenant'
    })

    const { caseId } = await context.params
    const body = (await request.json().catch(() => ({}))) as { reason?: string | null }

    const document = await renderFinalSettlementDocumentForCase({
      offboardingCaseId: caseId,
      actorUserId: tenant.userId,
      reissue: true,
      reason: body.reason
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    return toResponse(error, 'Unable to reissue final settlement document.')
  }
}
