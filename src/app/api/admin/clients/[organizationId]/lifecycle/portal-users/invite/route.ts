import { NextResponse } from 'next/server'

import { resolveAccountScope } from '@/lib/account-360/resolve-scope'
import { authorizeLifecycle } from '@/lib/client-lifecycle/api-helpers'
import { isClientPortalRole } from '@/lib/client-onboarding/client-portal-roles'
import { ClientPortalInviteError, inviteClientPortalUser } from '@/lib/client-onboarding/invite-client-portal-user'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

interface InviteItem {
  email?: unknown
  fullName?: unknown
  roleCode?: unknown
  hubspotContactId?: unknown
}

type InviteOutcome = {
  email: string
  status: 'invited' | 'already' | 'error'
  userId?: string
  roleAssigned?: boolean
  code?: string
}

/**
 * TASK-1001 — POST /api/admin/clients/[organizationId]/lifecycle/portal-users/invite
 *
 * Invita personas al portal cliente desde el checklist de onboarding (ítem
 * provision_client_users_access). client_id se resuelve server-side desde la org
 * (NUNCA del body). Idempotente (onExisting='ensure'): re-invitar no duplica. Cada
 * persona se procesa de forma aislada (una invitación mala no rompe el batch).
 */
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params
  const { tenant, errorResponse } = await authorizeLifecycle('client.lifecycle.portal_user.invite')

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'No autorizado', code: 'unauthorized', actionable: false }, { status: 401 })
  }

  let invites: InviteItem[] = []

  try {
    const body = (await request.json()) as { invites?: unknown }

    invites = Array.isArray(body.invites) ? (body.invites as InviteItem[]) : []
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.', code: 'invalid_body', actionable: false }, { status: 400 })
  }

  if (invites.length === 0) {
    return NextResponse.json({ error: 'Selecciona al menos una persona.', code: 'no_invites', actionable: true }, { status: 400 })
  }

  // Validación dura de roles ANTES de tocar la DB: solo client_* válidos para portal.
  for (const inv of invites) {
    if (typeof inv.roleCode !== 'string' || !isClientPortalRole(inv.roleCode)) {
      return NextResponse.json({ error: 'Rol de portal inválido.', code: 'invalid_role', actionable: false }, { status: 422 })
    }
  }

  // client_id canónico resuelto server-side desde la org (anti-tamper).
  const scope = await resolveAccountScope(organizationId)
  const clientId = scope?.clientIds?.[0] ?? null

  if (!clientId) {
    return NextResponse.json(
      { error: 'La organización aún no tiene un Cliente asociado. Crea el Cliente antes de invitar personas.', code: 'client_not_ready', actionable: true },
      { status: 422 }
    )
  }

  const results: InviteOutcome[] = []

  for (const inv of invites) {
    const email = typeof inv.email === 'string' ? inv.email : ''

    try {
      const result = await inviteClientPortalUser({
        email,
        fullName: typeof inv.fullName === 'string' ? inv.fullName : '',
        clientId,
        roleCodes: [inv.roleCode as string],
        actorUserId: tenant.userId,
        onExisting: 'ensure'
      })

      results.push({
        email: result.email,
        status: result.created ? 'invited' : 'already',
        userId: result.userId,
        roleAssigned: result.rolesAssigned.length > 0
      })
    } catch (err) {
      if (err instanceof ClientPortalInviteError) {
        results.push({ email, status: 'error', code: err.code })
      } else {
        captureWithDomain(err, 'commercial', { tags: { source: 'client_portal_invite', stage: 'invite' } })
        results.push({ email, status: 'error', code: 'internal_error' })
      }
    }
  }

  return NextResponse.json({ ok: true, clientId, results })
}
