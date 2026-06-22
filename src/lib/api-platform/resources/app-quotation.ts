import 'server-only'

import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { searchServiceCatalog } from '@/lib/commercial/service-catalog-search'
import {
  runQuoteSimulationFromBody,
  type QuotePricingSimulation,
  type SimulateQuotePricingContext
} from '@/lib/finance/pricing/simulate-quote-pricing'
import { can } from '@/lib/entitlements/runtime'
import { canViewCostStack } from '@/lib/tenant/authorization'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

/**
 * API Platform app lane del cotizador read/compute (TASK-1211, `quotation.v1`).
 * Consumer first-party programático del MISMO primitive que UI y Nexa. La
 * audiencia (y por ende la redacción de cost stack/margen) se deriva del tenant.
 */

const assertSimulateAccess = (tenant: TenantContext): void => {
  if (!can(tenant, 'commercial.quote.simulate', 'read', 'tenant')) {
    throw new ApiPlatformError('You do not have access to quote pricing.', {
      statusCode: 403,
      errorCode: 'forbidden'
    })
  }
}

const resolveContext = (tenant: TenantContext): SimulateQuotePricingContext => ({
  audience: tenant.tenantType === 'client' ? 'client' : 'internal',
  costStackVisible: tenant.tenantType !== 'client' && canViewCostStack(tenant)
})

/** GET /api/platform/app/quotation/services?q=… — resolver nombre→servicio. */
export const getAppQuotationServicesPayload = async ({
  context,
  request
}: {
  context: AppPlatformRequestContext
  request: Request
}): Promise<{ items: Awaited<ReturnType<typeof searchServiceCatalog>>; total: number }> => {
  assertSimulateAccess(context.tenant)

  const url = new URL(request.url)
  const query = url.searchParams.get('q') ?? url.searchParams.get('query') ?? ''
  const limitRaw = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : undefined

  const items = await searchServiceCatalog(query, { limit })

  return { items, total: items.length }
}

/** POST /api/platform/app/quotation/simulate — estimado referencial (no vinculante). */
export const simulateAppQuotationPayload = async ({
  context,
  request
}: {
  context: AppPlatformRequestContext
  request: Request
}): Promise<QuotePricingSimulation> => {
  assertSimulateAccess(context.tenant)

  let body: unknown

  try {
    body = await request.json()
  } catch {
    throw new ApiPlatformError('A JSON request body is required.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const result = await runQuoteSimulationFromBody(body, resolveContext(context.tenant))

  if (!result.ok) {
    throw new ApiPlatformError(result.error, { statusCode: 400, errorCode: 'bad_request' })
  }

  return result.simulation
}
