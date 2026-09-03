import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { assertHrEntitlement, requireHrCoreManageTenantContext, toHrCoreErrorResponse } from '@/lib/hr-core/shared'
import { reviewOffboardingCase, type ReviewOffboardingCaseInput } from '@/lib/workforce/offboarding'

export const dynamic = 'force-dynamic'

/**
 * TASK-1349 — Review/correct an existing offboarding case with an explicit,
 * audited contractual decision (`access_only` | `relationship_ended`).
 *
 * Thin adapter: transport + authorization only. Every rule (reason length,
 * version conflict, explicit dates/cause, lane recompute, approval
 * invalidation) lives in `reviewOffboardingCase` so the app lane and the UI
 * share it. `approveNow` is honoured only when the actor also holds
 * `hr.offboarding_case:approve`.
 */
export async function POST(request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { tenant, errorResponse } = await requireHrCoreManageTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as ReviewOffboardingCaseInput | null

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'La revisión necesita una decisión, un motivo y la versión del caso.', code: 'offboarding_review_payload_invalid', actionable: true },
        { status: 400 }
      )
    }

    assertHrEntitlement({ tenant, capability: 'workforce.offboarding.review_case', action: 'execute', scope: 'tenant' })

    const canApprove = can(tenant, 'hr.offboarding_case', 'approve', 'tenant')

    if (body.approveNow && !canApprove) {
      assertHrEntitlement({ tenant, capability: 'hr.offboarding_case', action: 'approve', scope: 'tenant' })
    }

    const { caseId } = await context.params

    const result = await reviewOffboardingCase({ caseId, input: body, actorUserId: tenant.userId, canApprove })

    return NextResponse.json(result)
  } catch (error) {
    return toHrCoreErrorResponse(error, 'No se pudo revisar el caso de offboarding.')
  }
}
