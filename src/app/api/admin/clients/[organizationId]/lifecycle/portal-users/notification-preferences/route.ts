import { NextResponse } from 'next/server'

import { resolveAccountScope } from '@/lib/account-360/resolve-scope'
import { authorizeLifecycle } from '@/lib/client-lifecycle/api-helpers'
import { applyClientNotificationPreferencePolicy, CLIENT_SERVICE_NOTIFICATION_POLICY_KEY } from '@/lib/notifications/client-preference-policy'
import { ensureNotificationSchema } from '@/lib/notifications/schema'
import { captureWithDomain } from '@/lib/observability/capture'

export const dynamic = 'force-dynamic'

/**
 * TASK-1852 — POST /api/admin/clients/[organizationId]/lifecycle/portal-users/notification-preferences
 *
 * Aplica la política explícita de preferencias `client_service_default_v1` a personas cliente de la
 * organización (client_id resuelto server-side). Persiste filas de `notification_preferences`; no
 * envía nada. La persona puede cambiar sus preferencias después desde su portal.
 * Body: `{ userIds: string[], policy: 'client_service_default_v1' }`.
 */
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params
  const { tenant, errorResponse } = await authorizeLifecycle('client.lifecycle.portal_user.invite')

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'No autorizado', code: 'unauthorized', actionable: false }, { status: 401 })
  }

  let userIds: string[] = []

  try {
    const body = (await request.json()) as { userIds?: unknown; policy?: unknown }

    if (body.policy !== CLIENT_SERVICE_NOTIFICATION_POLICY_KEY) {
      return NextResponse.json({ error: 'Política de preferencias no reconocida.', code: 'invalid_policy', actionable: false }, { status: 400 })
    }

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
    return NextResponse.json({ error: 'La organización aún no tiene un Cliente asociado.', code: 'client_not_ready', actionable: true }, { status: 422 })
  }

  try {
    await ensureNotificationSchema()
    const result = await applyClientNotificationPreferencePolicy({ clientId, userIds })

    return NextResponse.json({ ok: true, clientId, ...result })
  } catch (err) {
    captureWithDomain(err, 'commercial', { tags: { source: 'client_portal_invite', stage: 'notification_preferences' } })

    return NextResponse.json({ error: 'No pudimos aplicar las preferencias.', code: 'internal_error', actionable: true }, { status: 502 })
  }
}
