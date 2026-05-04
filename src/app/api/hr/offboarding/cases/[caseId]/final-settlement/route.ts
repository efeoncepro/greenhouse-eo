import { NextResponse } from 'next/server'

import {
  calculateFinalSettlementForCase,
  getLatestFinalSettlementForCase,
  listFinalSettlementsForCase,
  type CalculateFinalSettlementInput
} from '@/lib/payroll/final-settlement'
import { assertHrEntitlement, requireHrCoreManageTenantContext, requireHrCoreReadTenantContext } from '@/lib/hr-core/shared'
import { PayrollValidationError } from '@/lib/payroll/shared'

export const dynamic = 'force-dynamic'

const toFinalSettlementErrorResponse = (error: unknown, fallbackMessage: string) => {
  if (error instanceof PayrollValidationError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details ?? null
      },
      { status: error.statusCode }
    )
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
      capability: 'hr.final_settlement',
      action: 'read',
      scope: 'tenant'
    })

    const { caseId } = await context.params
    const { searchParams } = new URL(request.url)

    if (searchParams.get('all') === '1') {
      const settlements = await listFinalSettlementsForCase(caseId)

      return NextResponse.json({ settlements })
    }

    const settlement = await getLatestFinalSettlementForCase(caseId)

    return NextResponse.json({ settlement })
  } catch (error) {
    return toFinalSettlementErrorResponse(error, 'Unable to load final settlement.')
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
      capability: 'hr.final_settlement',
      action: 'create',
      scope: 'tenant'
    })

    const { caseId } = await context.params
    const body = (await request.json().catch(() => ({}))) as Partial<CalculateFinalSettlementInput>

    const settlement = await calculateFinalSettlementForCase({
      offboardingCaseId: caseId,
      actorUserId: tenant.userId,
      sourceRef: body.sourceRef,
      manualDeductions: body.manualDeductions
    })

    return NextResponse.json({ settlement }, { status: 201 })
  } catch (error) {
    return toFinalSettlementErrorResponse(error, 'Unable to calculate final settlement.')
  }
}
