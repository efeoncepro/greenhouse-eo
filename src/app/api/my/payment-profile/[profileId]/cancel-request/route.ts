import { NextResponse } from 'next/server'

import { getServerAuthSession } from '@/lib/auth'
import { can } from '@/lib/entitlements/runtime'
import {
  PaymentProfileConflictError,
  PaymentProfileValidationError
} from '@/lib/finance/beneficiary-payment-profiles/errors'
import { cancelSelfServicePaymentProfile } from '@/lib/finance/beneficiary-payment-profiles/self-service'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireMyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ profileId: string }>
}

interface RequestBody {
  reason?: string
}

/**
 * TASK-753 — POST /api/my/payment-profile/[profileId]/cancel-request
 *
 * Self-service cancel: el colaborador anula su propia solicitud (perfil
 * pending_approval que el creo). Reglas duras enforcadas en el helper:
 *  - Profile.beneficiary_id === session.memberId (sino 403)
 *  - Profile.status IN (draft|pending_approval) (sino 409)
 *  - Profile.created_by === session.userId (sino 403)
 *
 * Capability: `personal_workspace.payment_profile.request_change_self`
 * (misma del POST de creacion, scope=own). El flag de cancel-request es
 * implicito en este endpoint.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'personal_workspace.payment_profile.request_change_self', 'create', 'own')) {
    return NextResponse.json(
      {
        error: 'Capability missing: personal_workspace.payment_profile.request_change_self',
        code: 'forbidden'
      },
      { status: 403 }
    )
  }

  const { profileId } = await params

  let body: RequestBody = {}

  try {
    body = ((await request.json()) ?? {}) as RequestBody
  } catch {
    body = {}
  }

  if (typeof body.reason !== 'string' || body.reason.trim().length < 3) {
    return NextResponse.json(
      { error: 'Razon de cancelacion requerida (minimo 3 caracteres)', code: 'reason_required' },
      { status: 400 }
    )
  }

  const session = await getServerAuthSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Session user id missing', code: 'unauthorized' }, { status: 401 })
  }

  try {
    const result = await cancelSelfServicePaymentProfile({
      profileId,
      memberId,
      userId: session.user.id,
      reason: body.reason
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof PaymentProfileValidationError || error instanceof PaymentProfileConflictError) {
      return NextResponse.json(
        { error: redactErrorForResponse(error), code: error.code },
        { status: error.statusCode }
      )
    }

    captureWithDomain(error, 'finance', {
      extra: { route: 'my/payment-profile/cancel-request', profileId, memberId }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error), code: 'internal_error' },
      { status: 500 }
    )
  }
}
