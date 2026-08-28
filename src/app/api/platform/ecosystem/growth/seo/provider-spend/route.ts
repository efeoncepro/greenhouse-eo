import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemSeoProviderSpendPayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

export const dynamic = 'force-dynamic'

/**
 * TASK-1696 — Gasto de proveedor del mes por organización, cortado por consumidor (`seo` | `aeo`)
 * y por base de costo (facturado | estimado).
 *
 * Lane machine-authed del ecosystem. A diferencia del resto del lane SEO, éste es **sólo para
 * bindings `internal`**: el gasto es lo que a Efeonce le cuesta servir a un cliente, no algo que
 * el cliente haya consumido — un binding org-scoped leyendo su propia fila estaría leyendo
 * nuestra estructura de costos. Se rechaza con 404 anti-oracle.
 *
 * Passthrough del reader canónico `readSeoProviderSpendByConsumer`: las dos monedas viajan
 * SIEMPRE separadas, nunca colapsadas en un total opaco.
 */
export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.provider_spend',
    handler: async context => getEcosystemSeoProviderSpendPayload({ context, request })
  })
}
