import 'server-only'

import type { ApiPlatformRequestContext, ApiPlatformSuccessResult } from '@/lib/api-platform/core/context'
import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { searchServiceCatalog } from '@/lib/commercial/service-catalog-search'
import {
  runQuoteSimulationFromBody,
  type QuotePricingSimulation,
  type SimulateQuotePricingContext
} from '@/lib/finance/pricing/simulate-quote-pricing'

/**
 * API Platform ecosystem lane del cotizador (TASK-1211, `quotation.v1`) — consumido
 * por MCP / agentes downstream. Consultar-first (ADR): read-only, simulate-only.
 *
 * La audiencia se deriva del binding scope del consumer (no de un usuario, que no
 * existe en este lane). `costStackVisible` es SIEMPRE false: el desglose de costo es
 * finance-interno (`canViewCostStack`) y un consumidor externo nunca lo ve. Un
 * binding `client` recibe perfil `client` (sin margen); cualquier otro, `internal`
 * (margen visible, pero nunca cost stack).
 */

const resolveContext = (context: ApiPlatformRequestContext): SimulateQuotePricingContext => ({
  audience: context.binding.greenhouseScopeType === 'client' ? 'client' : 'internal',
  costStackVisible: false
})

const resolveLimit = (raw: string | null): number | undefined => {
  const value = Number(raw)

  return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined
}

export const getEcosystemQuotationServicesPayload = async ({
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<{ items: Awaited<ReturnType<typeof searchServiceCatalog>>; total: number }>> => {
  const url = new URL(request.url)
  const query = url.searchParams.get('q') ?? url.searchParams.get('query') ?? ''
  const items = await searchServiceCatalog(query, { limit: resolveLimit(url.searchParams.get('limit')) })

  return { data: { items, total: items.length } }
}

export const simulateEcosystemQuotationPayload = async ({
  context,
  request
}: {
  context: ApiPlatformRequestContext
  request: Request
}): Promise<ApiPlatformSuccessResult<QuotePricingSimulation>> => {
  const body = await request.json().catch(() => null)

  if (!body || typeof body !== 'object') {
    throw new ApiPlatformError('A JSON request body is required.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }

  const simulationContext = resolveContext(context)
  const result = await runQuoteSimulationFromBody(body, simulationContext)

  if (!result.ok) {
    throw new ApiPlatformError(result.error, { statusCode: 400, errorCode: 'bad_request' })
  }

  return {
    data: result.simulation,
    meta: { outputProfile: simulationContext.audience, clientId: context.binding.clientId }
  }
}
