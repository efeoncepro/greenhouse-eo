import { NextResponse } from 'next/server'

import {
  getLatestFinalSettlementDocumentForCase,
  listFinalSettlementDocumentsForCase,
  renderFinalSettlementDocumentForCase,
  type RenderFinalSettlementDocumentInput
} from '@/lib/payroll/final-settlement'
import { assertHrEntitlement, requireHrCoreManageTenantContext, requireHrCoreReadTenantContext } from '@/lib/hr-core/shared'
import { PayrollValidationError } from '@/lib/payroll/shared'

export const dynamic = 'force-dynamic'

const toDocumentErrorResponse = (error: unknown, fallbackMessage: string) => {
  if (error instanceof PayrollValidationError) {
    return NextResponse.json({ error: error.message, details: error.details ?? null }, { status: error.statusCode })
  }

  console.error(fallbackMessage, error)

  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}

export async function GET(request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertHrEntitlement({
      tenant,
      capability: 'hr.final_settlement_document',
      action: 'read',
      scope: 'tenant'
    })

    const { caseId } = await context.params
    const { searchParams } = new URL(request.url)

    if (searchParams.get('all') === '1') {
      const documents = await listFinalSettlementDocumentsForCase(caseId)

      return NextResponse.json({ documents })
    }

    const document = await getLatestFinalSettlementDocumentForCase(caseId)

    return NextResponse.json({ document })
  } catch (error) {
    return toDocumentErrorResponse(error, 'Unable to load final settlement document.')
  }
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
      action: 'create',
      scope: 'tenant'
    })

    const { caseId } = await context.params
    const body = (await request.json().catch(() => ({}))) as Partial<RenderFinalSettlementDocumentInput>

    const document = await renderFinalSettlementDocumentForCase({
      offboardingCaseId: caseId,
      actorUserId: tenant.userId,
      reissue: body.reissue,
      reason: body.reason
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    return toDocumentErrorResponse(error, 'Unable to render final settlement document.')
  }
}
