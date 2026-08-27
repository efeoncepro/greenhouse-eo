import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import {
  getEcosystemSeoProspectDiagnosticPayload,
  runEcosystemSeoProspectDiagnosticPayload
} from '@/lib/api-platform/resources/ecosystem-growth-seo'

/**
 * TASK-1709 — `GET/POST /api/platform/ecosystem/growth/seo/prospect-diagnostic`
 *
 * GET = lectura de diagnósticos de prospecto. POST = disparar uno — un COMMAND: usa
 * `runEcosystemCommandRoute` porque comprometer gasto necesita idempotencia por
 * `Idempotency-Key` y auditoría de ejecución; un reintento del gateway sobre un timeout
 * no puede volver a comprar el diagnóstico (además del claim por dominio/día en DB).
 *
 * 🔴 AMBOS verbos sólo aceptan bindings de scope `internal`: la data de prospección es
 * inteligencia de adquisición de Efeonce, jamás client-facing.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.prospect_diagnostic',
    handler: async context => getEcosystemSeoProspectDiagnosticPayload({ context, request })
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  return runEcosystemCommandRoute({
    request,
    routeKey: 'platform.ecosystem.growth.seo.prospect_diagnostic.run',
    body,
    handler: async context => runEcosystemSeoProspectDiagnosticPayload({ context, body })
  })
}
