import { NextResponse } from 'next/server'

import { resolveAccountScope } from '@/lib/account-360/resolve-scope'
import { authorizeLifecycle } from '@/lib/client-lifecycle/api-helpers'
import { ClientPortalInviteError, deliverClientPortalInvitation } from '@/lib/client-onboarding/invite-client-portal-user'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

type DeliverOutcome = {
  userId: string
  status: 'sent' | 'failed' | 'error'
  email?: string
  code?: string
}

/**
 * TASK-1852 — POST /api/admin/clients/[organizationId]/lifecycle/portal-users/deliver
 *
 * Entrega (o reenvía) la invitación de personas provisionadas con `delivery: 'deferred'`.
 * Misma capability que la invitación; client_id se resuelve server-side desde la org y la
 * persona debe pertenecer a ese cliente y seguir `invited`. Envía correo: sólo con instrucción
 * explícita del operador.
 */
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params
  const { tenant, errorResponse } = await authorizeLifecycle('client.lifecycle.portal_user.invite')

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'No autorizado', code: 'unauthorized', actionable: false }, { status: 401 })
  }

  let userIds: string[] = []

  try {
    const body = (await request.json()) as { userIds?: unknown }

    userIds = Array.isArray(body.userIds) ? body.userIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0) : []
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.', code: 'invalid_body', actionable: false }, { status: 400 })
  }

  if (userIds.length === 0 || userIds.length > 50) {
    return NextResponse.json({ error: 'Selecciona entre una y cincuenta personas.', code: 'no_users', actionable: true }, { status: 400 })
  }

  const scope = await resolveAccountScope(organizationId)
  const clientId = scope?.clientIds?.[0] ?? null

  if (!clientId) {
    return NextResponse.json(
      { error: 'La organización aún no tiene un Cliente asociado.', code: 'client_not_ready', actionable: true },
      { status: 422 }
    )
  }

  const results: DeliverOutcome[] = []

  for (const userId of userIds) {
    try {
      const result = await deliverClientPortalInvitation({
        userId,
        clientId,
        actorName: null,
        actorEmail: null
      })

      results.push({ userId: result.userId, email: result.email, status: result.deliveryStatus })
    } catch (err) {
      if (err instanceof ClientPortalInviteError) {
        results.push({ userId, status: 'error', code: err.code })
      } else {
        captureWithDomain(err, 'commercial', { tags: { source: 'client_portal_invite', stage: 'deliver' } })
        results.push({ userId, status: 'error', code: 'internal_error' })
      }
    }
  }

  return NextResponse.json({ ok: true, clientId, results })
}
