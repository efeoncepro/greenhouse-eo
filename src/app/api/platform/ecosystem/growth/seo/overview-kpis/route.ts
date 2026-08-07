import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemSeoOverviewKpisPayload } from '@/lib/api-platform/resources/ecosystem-growth-seo'

export const dynamic = 'force-dynamic'

/**
 * TASK-1306 — KPIs norte del cockpit Overview SEO (clics, impresiones, posición ponderada
 * por impresiones y CTR del período + ventana previa comparable + serie diaria).
 *
 * Lane machine-authed del ecosystem: org por binding (org-scoped manda, internal exige
 * `organizationId`), entitlement per-org `seo_v1` con 404 anti-oracle. Passthrough del
 * reader canónico `readSeoOverviewKpis` — la UI y Nexa/MCP consumen EL MISMO cálculo,
 * así que la posición ponderada nunca se re-implementa por consumer (Full API Parity).
 */
export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.overview_kpis',
    handler: async context => getEcosystemSeoOverviewKpisPayload({ context, request })
  })
}
