import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { getServerAuthSession } from '@/lib/auth'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import {
  GlobeCreditFundingBrokerError,
  proposeGlobeCreditFunding
} from '@/lib/globe/credit-administration-broker'
import { captureWithDomain } from '@/lib/observability/capture'
import { getTenantContext } from '@/lib/tenant/get-tenant-context'

import { GreenhouseGlobeConfigurationError } from '@/lib/globe/client'

import {
  brokerErrorResponse,
  globeConfigurationErrorResponse,
  parseFundingBody,
  requireIdempotencyKey
} from '../shared'

/**
 * TASK-1566 Slice 5 — `POST /api/admin/globe/credit-funding/propose`.
 *
 * Read-only sobre Globe: devuelve el plan para que un humano lo revise y deja la intención
 * registrada. **No mueve dinero.** Por eso lleva su propia capability, distinta de la de confirmar:
 * ver el plan no puede implicar la autoridad de ejecutarlo.
 */
export const dynamic = 'force-dynamic'

export const POST = async (request: Request) => {
  try {
    const session = await getServerAuthSession()

    if (!session?.user) return canonicalErrorResponse('unauthorized')

    const tenant = await getTenantContext()

    if (!tenant) return canonicalErrorResponse('forbidden')

    const subject = buildTenantEntitlementSubject(tenant)

    if (!can(subject, 'platform.globe_credit_funding.propose', 'execute', 'all')) {
      return canonicalErrorResponse('forbidden')
    }

    const idempotencyKey = requireIdempotencyKey(request)

    if (!idempotencyKey) return canonicalErrorResponse('globe_funding_invalid_request')

    const body = await request.json().catch(() => undefined)
    const parsed = parseFundingBody(body)

    if (!parsed) return canonicalErrorResponse('globe_funding_invalid_request')

    const proposal = await proposeGlobeCreditFunding({
      globeWorkspaceId: parsed.globeWorkspaceId,
      poolId: parsed.poolId,
      grantCredits: parsed.grantCredits,
      ...(parsed.monthlyCap === undefined ? {} : { monthlyCap: parsed.monthlyCap }),
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      // La atribución sale de la SESIÓN, nunca del cuerpo: si el caller pudiera declararla, este
      // carril valdría exactamente lo mismo que el que reemplaza.
      actor: { userId: tenant.userId, entitlement: 'platform.globe_credit_funding.propose' },
      idempotencyKey
    })

    return Response.json({ proposal }, { status: 200 })
  } catch (error) {
    if (error instanceof GlobeCreditFundingBrokerError) return brokerErrorResponse(error)

    if (error instanceof GreenhouseGlobeConfigurationError) {
      return globeConfigurationErrorResponse(error, 'propose')
    }

    captureWithDomain(error, 'platform', { extra: { operation: 'globe_credit_funding.propose' } })

    return canonicalErrorResponse('internal_error')
  }
}
