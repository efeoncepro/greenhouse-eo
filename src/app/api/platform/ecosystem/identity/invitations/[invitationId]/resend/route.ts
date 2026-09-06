import { runEcosystemCommandRoute } from '@/lib/api-platform/core/commands'
import { resendEcosystemDelegatedInvitation } from '@/lib/api-platform/resources/ecosystem-identity-invitations'

export const dynamic = 'force-dynamic'

/**
 * TASK-1837 — Autoridad delegada del cliente: `resend` sobre una invitación del propio binding
 * (consumer interno = gateway; `environment` + `subject` de la persona; flag OFF ⇒ 404).
 */
export async function POST(request: Request, { params }: { params: Promise<{ invitationId: string }> }) {
  const body = await request.json().catch(() => null)
  const { invitationId } = await params

  return runEcosystemCommandRoute({
    request,
    routeKey: 'platform.ecosystem.identity.invitations.resend',
    body,
    handler: async context => ({
      data: await resendEcosystemDelegatedInvitation({ context, body, invitationId }),
      status: 201
    })
  })
}
