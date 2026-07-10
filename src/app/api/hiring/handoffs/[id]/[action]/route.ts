import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { hiringInvalidBodyResponse, hiringNotFoundResponse, toHiringErrorResponse } from '@/lib/hiring'
import { isHiringHandoffCommandAction, transitionHiringHandoff } from '@/lib/hiring/handoff'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface TransitionBody {
  reasonCode?: string
  reasonDetail?: string
  downstreamRef?: string
}

/**
 * TASK-356 — Command gobernado del HiringHandoff: POST /api/hiring/handoffs/[id]/(approve|
 * setup|complete|cancel). Capability hiring.handoff.approve (Full API Parity: mismo primitive
 * para 770 UI / Nexa propose→confirm / CLI). El command solo transiciona el boundary object;
 * NUNCA crea member/assignment/placement/payroll.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.handoff.approve', 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', {
      extra: { requiredCapability: 'hiring.handoff.approve' },
    })
  }

  const { id, action } = await params

  if (!isHiringHandoffCommandAction(action)) {
    return hiringNotFoundResponse('La acción de handoff no existe.', 'hiring_handoff_action_not_found')
  }

  let body: TransitionBody = {}

  try {
    const raw = await request.text()

    body = raw ? (JSON.parse(raw) as TransitionBody) : {}
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    const result = await transitionHiringHandoff({
      handoffId: id,
      action,
      actorUserId: tenant.userId,
      reasonCode: body.reasonCode,
      reasonDetail: body.reasonDetail,
      downstreamRef: body.downstreamRef,
    })

    return NextResponse.json(result)
  } catch (error) {
    return toHiringErrorResponse(error, 'handoff_transition')
  }
}
