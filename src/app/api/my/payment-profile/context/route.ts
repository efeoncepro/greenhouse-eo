import { NextResponse } from 'next/server'

import { can } from '@/lib/entitlements/runtime'
import { resolveSelfServicePaymentProfileContext } from '@/lib/finance/beneficiary-payment-profiles/resolve-self-service-context'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireMyTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * TASK-753 — GET /api/my/payment-profile/context
 *
 * Retorna el contrato canónico de regimen-aware UX para el self-service:
 *  - regime: chile_dependent | honorarios_chile | international | unset
 *  - countryCode + countryName + currency (inferidos)
 *  - legalFullName + legalDocumentMasked + verificationStatus (TASK-784)
 *  - unsetReason cuando aplica (degraded state)
 *
 * NO devuelve secretos. Usa la misma capability `read_self`.
 */
export async function GET() {
  const { tenant, memberId, errorResponse } = await requireMyTenantContext()

  if (!tenant || !memberId) {
    return errorResponse ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!can(tenant, 'personal_workspace.payment_profile.read_self', 'read', 'own')) {
    return NextResponse.json(
      { error: 'Capability missing: personal_workspace.payment_profile.read_self', code: 'forbidden' },
      { status: 403 }
    )
  }

  try {
    const context = await resolveSelfServicePaymentProfileContext(memberId)

    return NextResponse.json(context)
  } catch (error) {
    captureWithDomain(error, 'finance', {
      extra: { route: 'my/payment-profile/context', memberId }
    })

    return NextResponse.json(
      { error: redactErrorForResponse(error), code: 'internal_error' },
      { status: 500 }
    )
  }
}
