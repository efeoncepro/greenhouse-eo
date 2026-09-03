import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemMcpSkillCatalogPayload } from '@/lib/api-platform/resources/ecosystem-mcp-skills'

export const dynamic = 'force-dynamic'

/**
 * TASK-1804 — Catálogo de manuales de uso de la superficie MCP, filtrado por binding.
 *
 * Lane machine-authed del ecosystem. Devuelve resúmenes (name, description, tools gobernadas,
 * URI), nunca cuerpos: el catálogo existe para no inflar el contexto del agente. Un binding que no
 * sea `internal` no ve los manuales `internal` — y no sabe que existen (anti-oráculo).
 *
 * ⚠️ Los manuales NO se leen del filesystem en runtime: viajan en el bundle como artefacto
 * generado (`skill-catalog.generated.json`, `pnpm mcp:skills:generate` / `mcp:skills:check`). La
 * primera versión usaba `readFileSync` + `outputFileTracingIncludes` y Vercel rechazó el build
 * (función de 397 MB): Turbopack incluye el proyecto entero ante un `fs` con ruta dinámica. Si el
 * artefacto no coincide con el manifiesto, el reader LANZA y esta lane responde 500, nunca un
 * catálogo vacío en verde.
 */
export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.mcp.skills',
    handler: async context => getEcosystemMcpSkillCatalogPayload({ context, request })
  })
}
