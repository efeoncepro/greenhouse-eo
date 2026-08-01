import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getServerAuthSession } from '@/lib/auth'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { confirmGlobeCreditFunding, GlobeCreditFundingBrokerError } from '@/lib/globe/credit-administration-broker'
import { captureWithDomain } from '@/lib/observability/capture'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

import { GreenhouseGlobeConfigurationError } from '@/lib/globe/client'

import {
  brokerErrorResponse,
  globeConfigurationErrorResponse,
  parseConfirmBody,
  resolveFundingActorAuthMode,
  requireIdempotencyKey
} from '../shared'

/**
 * TASK-1566 Slice 5 — `POST /api/admin/globe/credit-funding/confirm`.
 *
 * **Único punto que dispara la mutación en Globe.** Lleva su propia capability porque confirmar es
 * una autoridad distinta de proponer, y la disyunción confirmante ≠ proponente la impone un `CHECK`
 * en `globe_credit_funding_intents` — no esta ruta, y no una convención de payload.
 *
 * Un agente autenticado puede confirmar sólo cuando la política delegada del workspace y sus límites
 * lo permiten. La base aplica esa decisión usando la proveniencia firmada de la sesión.
 */
export const dynamic = 'force-dynamic'

export const POST = async (request: Request) => {
  try {
    const session = await getServerAuthSession()

    if (!session?.user) return canonicalErrorResponse('unauthorized')

    const tenant = await getTenantContext()

    if (!tenant) return canonicalErrorResponse('forbidden')

    const subject = buildTenantEntitlementSubject(tenant)

    if (!can(subject, 'platform.globe_credit_funding.confirm', 'execute', 'all')) {
      return canonicalErrorResponse('forbidden')
    }

    const idempotencyKey = requireIdempotencyKey(request)

    if (!idempotencyKey) return canonicalErrorResponse('globe_funding_invalid_request')

    const body = await request.json().catch(() => undefined)
    const parsed = parseConfirmBody(body)

    if (!parsed) return canonicalErrorResponse('globe_funding_invalid_request')

    const outcome = await confirmGlobeCreditFunding({
      globeWorkspaceId: parsed.globeWorkspaceId,
      proposalId: parsed.proposalId,
      fingerprint: parsed.fingerprint,
      // Igual que en `propose`: la identidad sale de la sesión. Es lo único que hace que la
      // atribución humana signifique algo del otro lado.
      actor: {
        userId: tenant.userId,
        entitlement: 'platform.globe_credit_funding.confirm',
        authMode: resolveFundingActorAuthMode({
          provider: session.user.provider,
          authMode: session.user.authMode || tenant.authMode
        })
      },
      idempotencyKey
    })

    return Response.json({ outcome }, { status: 200 })
  } catch (error) {
    if (error instanceof GlobeCreditFundingBrokerError) return brokerErrorResponse(error)

    if (error instanceof GreenhouseGlobeConfigurationError) {
      return globeConfigurationErrorResponse(error, 'confirm')
    }

    captureWithDomain(error, 'platform', { extra: { operation: 'globe_credit_funding.confirm' } })

    return canonicalErrorResponse('internal_error')
  }
}
