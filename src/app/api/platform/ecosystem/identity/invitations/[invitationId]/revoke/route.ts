import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { revokeEcosystemDelegatedInvitation } from '@/lib/api-platform/resources/ecosystem-identity-invitations'

export const dynamic = 'force-dynamic'

/**
 * TASK-1837 — Autoridad delegada del cliente: `revoke` sobre una invitación del propio binding
 * (consumer interno = gateway; `environment` + `subject` de la persona; flag OFF ⇒ 404).
 */
export async function POST(request: Request, { params }: { params: Promise<{ invitationId: string }> }) {
  const body = await request.json().catch(() => null)
  const { invitationId } = await params

  return runEcosystemCommandRoute({
    request,
    routeKey: 'platform.ecosystem.identity.invitations.revoke',
    body,
    handler: async context => ({
      data: await revokeEcosystemDelegatedInvitation({ context, body, invitationId }),
      status: 200
    })
  })
}
