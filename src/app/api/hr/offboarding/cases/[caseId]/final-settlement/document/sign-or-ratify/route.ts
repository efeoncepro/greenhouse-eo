import { NextResponse } from 'next/server'

import { assertHrEntitlement, requireHrCoreManageTenantContext } from '@/lib/hr-core/shared'
import { markFinalSettlementDocumentSignedOrRatifiedForCase } from '@/lib/payroll/final-settlement'
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
    assertHrEntitlement({ tenant, capability: 'hr.final_settlement_document', action: 'update', scope: 'tenant' })
    const { caseId } = await context.params

    const body = (await request.json().catch(() => ({}))) as {
      signatureEvidenceAssetId?: string | null
      signatureEvidenceRef?: Record<string, unknown> | null
      workerReservationOfRights?: boolean
      workerReservationNotes?: string | null
    }

    const document = await markFinalSettlementDocumentSignedOrRatifiedForCase({
      offboardingCaseId: caseId,
      actorUserId: tenant.userId,
      signatureEvidenceAssetId: body.signatureEvidenceAssetId,
      signatureEvidenceRef: body.signatureEvidenceRef,
      workerReservationOfRights: body.workerReservationOfRights,
      workerReservationNotes: body.workerReservationNotes
    })

    return NextResponse.json({ document })
  } catch (error) {
    return toResponse(error, 'Unable to mark final settlement document as signed or ratified.')
  }
}
