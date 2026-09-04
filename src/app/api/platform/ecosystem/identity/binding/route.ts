import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import { getEcosystemIdentityBindingPayload } from '@/lib/api-platform/resources/ecosystem-identity-binding'

export const dynamic = 'force-dynamic'

/**
 * TASK-1631 — Reader de acceso externo por `(environment, subject)` para el gateway MCP (TASK-1831).
 *
 * Lane machine-authed del ecosystem (consumer + binding sister-platform de scope `internal`). El
 * gateway resuelve issuer → environment con su config, llama acá con `subject` y compara el
 * `grants_version` devuelto contra el `gv` del token por igualdad. Nunca SQL desde el gateway.
 */
export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.identity.binding',
    handler: async context => getEcosystemIdentityBindingPayload({ context, request })
  })
}
