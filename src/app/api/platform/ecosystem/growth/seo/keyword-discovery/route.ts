import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import {
  discoverEcosystemSeoKeywordsPayload,
  getEcosystemSeoKeywordDiscoveryPayload
} from '@/lib/api-platform/resources/ecosystem-growth-seo'

/**
 * TASK-1664 — `GET/POST /api/platform/ecosystem/growth/seo/keyword-discovery`
 *
 * GET = lectura de corridas/candidatos (binding org-scoped o internal). POST = encolar o
 * previsualizar una corrida — un COMMAND: usa `runEcosystemCommandRoute` porque comprometer
 * gasto necesita idempotencia por `Idempotency-Key` y auditoría de ejecución; un reintento
 * del gateway sobre un timeout de red no puede volver a encolar. 🔴 El write sólo acepta
 * bindings de scope `internal` (mismo boundary que keywords/track).
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.keyword_discovery',
    handler: async context =>
      getEcosystemSeoKeywordDiscoveryPayload({ context, request })
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  return runEcosystemCommandRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.keyword_discovery.queue',
    body,
    handler: async context =>
      discoverEcosystemSeoKeywordsPayload({
        context,
        request,
        body
      })
  })
}
