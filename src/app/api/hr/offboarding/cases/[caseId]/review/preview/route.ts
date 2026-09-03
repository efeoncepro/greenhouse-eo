import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { assertHrEntitlement, requireHrCoreReadTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { getOffboardingCase, previewOffboardingCaseReview, type ReviewOffboardingCaseInput } from '@/lib/workforce/offboarding'

export const dynamic = 'force-dynamic'

/**
 * TASK-1349 — Preview of a review BEFORE any write: what would change (lane,
 * requirements, dates, status) and the payroll effect per period, computed
 * with the same pure derivation the command applies. Read-only.
 */
export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreReadTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    assertHrEntitlement({ tenant, capability: 'hr.offboarding_case', action: 'read', scope: 'tenant' })

    const body = (await request.json().catch(() => null)) as ReviewOffboardingCaseInput | null

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'La previsualización necesita una decisión y las fechas declaradas.', code: 'offboarding_review_payload_invalid', actionable: true },
        { status: 400 }
      )
    }

    const { caseId } = await context.params
    const current = await getOffboardingCase(caseId)

    if (!current) {
      return NextResponse.json({ error: 'Caso de offboarding no encontrado.', code: 'not_found', actionable: false }, { status: 404 })
    }

    const preview = previewOffboardingCaseReview({
      current,
      input: body,
      actorUserId: tenant.userId,
      canApprove: can(tenant, 'hr.offboarding_case', 'approve', 'tenant')
    })

    return NextResponse.json(preview)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'No se pudo previsualizar la revisión del caso.')
  }
}
