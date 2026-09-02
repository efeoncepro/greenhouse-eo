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
 * ⚠️ Los `.md` que sirve son filesystem input del runtime: `next.config.ts` los incluye en el
 * bundle de esta ruta (`outputFileTracingIncludes`). Si faltan, el reader LANZA y esta lane
 * responde 500, no un catálogo vacío en verde.
 */
export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.mcp.skills',
    handler: async context => getEcosystemMcpSkillCatalogPayload({ context, request })
  })
}
