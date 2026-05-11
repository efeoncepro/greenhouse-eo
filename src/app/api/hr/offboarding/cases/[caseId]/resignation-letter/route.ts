import { NextResponse } from 'next/server'

import { assertHrEntitlement, requireHrCoreManageTenantContext } from '@/lib/hr-core/shared'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { linkResignationLetterAsset } from '@/lib/workforce/offboarding'

export const dynamic = 'force-dynamic'

/**
 * TASK-862 Slice C — POST /api/hr/offboarding/cases/[caseId]/resignation-letter
 *
 * Link a previously uploaded asset (greenhouse_core.assets, context
 * "resignation_letter_ratified") as the carta de renuncia of an offboarding case.
 * Pre-requisito de readiness check resignation_letter_uploaded en
 * buildDocumentReadiness (TASK-862 Slice C).
 *
 * Body: { assetId: string }
 * Auth: requireHrCoreManageTenantContext + capability hr.offboarding_case:update:tenant.
 * Errors sanitizados via redactErrorForResponse + captureWithDomain('hr').
 */
export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertHrEntitlement({ tenant, capability: 'hr.offboarding_case', action: 'update', scope: 'tenant' })
    const { caseId } = await context.params

    const body = (await request.json().catch(() => ({}))) as { assetId?: unknown }
    const assetId = typeof body.assetId === 'string' ? body.assetId.trim() : ''

    if (!assetId) {
      return NextResponse.json({ error: 'assetId is required.' }, { status: 400 })
    }

    const updated = await linkResignationLetterAsset({
      offboardingCaseId: caseId,
      assetId,
      actorUserId: tenant.userId
    })

    return NextResponse.json({ offboardingCase: updated })
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case 'OFFBOARDING_CASE_NOT_FOUND':
          return NextResponse.json({ error: 'Offboarding case not found.' }, { status: 404 })
        case 'NOT_RESIGNATION_CASE':
          return NextResponse.json({ error: 'Resignation letter only applies to separation_type=resignation cases.' }, { status: 409 })
        case 'ASSET_NOT_FOUND':
          return NextResponse.json({ error: 'Asset not found.' }, { status: 404 })
      }
    }

    captureWithDomain(error, 'payroll', { tags: { route: 'offboarding-resignation-letter' } })

    return NextResponse.json({ error: redactErrorForResponse(error) }, { status: 500 })
  }
}
