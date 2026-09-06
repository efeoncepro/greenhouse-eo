import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { runEcosystemReadRoute } from '@/lib/api-platform/core/ecosystem-auth'
import {
  createEcosystemDelegatedInvitation,
  listEcosystemDelegatedInvitations
} from '@/lib/api-platform/resources/ecosystem-identity-invitations'

export const dynamic = 'force-dynamic'

/**
 * TASK-1837 — Autoridad delegada del cliente (lane machine-authed, consumer `internal` = gateway).
 * El administrador designado lista e invita a la gente de SU binding; el binding se deriva de la
 * resolución `(environment, subject)`, nunca del body. Flag OFF ⇒ 404.
 */
export async function GET(request: Request) {
  return runEcosystemReadRoute({
    request,
    routeKey: 'platform.ecosystem.identity.invitations.list',
    handler: async context => listEcosystemDelegatedInvitations({ context, request })
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  return runEcosystemCommandRoute({
    request,
    routeKey: 'platform.ecosystem.identity.invitations.create',
    body,
    handler: async context => {
      const payload = await createEcosystemDelegatedInvitation({ context, body })

      return { data: payload, status: payload.created ? 201 : 200 }
    }
  })
}
