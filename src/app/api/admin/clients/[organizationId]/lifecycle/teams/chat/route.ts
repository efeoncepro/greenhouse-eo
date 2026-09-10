import { NextResponse } from 'next/server'

import { resolveAccountScope } from '@/lib/account-360/resolve-scope'
import { authorizeLifecycle } from '@/lib/client-lifecycle/api-helpers'
import { writeTeamsGroupChatForSpace } from '@/lib/client-onboarding/teams-connect-store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export const dynamic = 'force-dynamic'

/**
 * TASK-1852 — POST /api/admin/clients/[organizationId]/lifecycle/teams/chat
 *
 * Registra el chat grupal de Teams compartido con el cliente como destino del bot
 * (`recipient_kind='chat_group'`), scopeado al Space activo de la organización. Read-only
 * hacia Teams: inspecciona el chat vía Graph y NO envía mensajes. `provisioning_status`
 * queda `ready` sólo si el bot está instalado en el chat; si no, `pending_setup` con razón.
 * Body: `{ chatId: '19:…@thread.v2', displayName }`. El Space se resuelve server-side.
 */
export async function POST(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params
  const { tenant, errorResponse } = await authorizeLifecycle('client.lifecycle.case.advance')

  if (!tenant) {
    return errorResponse ?? NextResponse.json({ error: 'No autorizado', code: 'unauthorized', actionable: false }, { status: 401 })
  }

  let chatId = ''
  let displayName = ''

  try {
    const body = (await request.json()) as { chatId?: unknown; displayName?: unknown }

    chatId = typeof body.chatId === 'string' ? body.chatId.trim() : ''
    displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.', code: 'invalid_body', actionable: false }, { status: 400 })
  }

  if (!chatId || !displayName || displayName.length > 160) {
    return NextResponse.json({ error: 'Indica el chat de Teams y un nombre visible.', code: 'missing_fields', actionable: true }, { status: 400 })
  }

  const scope = await resolveAccountScope(organizationId)
  const clientId = scope?.clientIds?.[0] ?? null

  if (!clientId) {
    return NextResponse.json({ error: 'La organización aún no tiene un Cliente asociado.', code: 'client_not_ready', actionable: true }, { status: 422 })
  }

  const spaces = await runGreenhousePostgresQuery<{ space_id: string }>(
    `SELECT space_id FROM greenhouse_core.spaces
      WHERE organization_id = $1 AND client_id = $2 AND active = TRUE AND status = 'active'
      ORDER BY space_id LIMIT 2`,
    [organizationId, clientId]
  )

  if (spaces.length !== 1) {
    return NextResponse.json({ error: 'La organización necesita exactamente un Space activo para anclar el chat.', code: 'space_ambiguous', actionable: true }, { status: 422 })
  }

  const result = await writeTeamsGroupChatForSpace(spaces[0].space_id, { chatId, displayName })

  if (!result.ok) {
    const status = result.reason === 'invalid_chat_id' ? 400 : 502

    return NextResponse.json({ error: result.reason === 'invalid_chat_id' ? 'El identificador no es un chat grupal de Teams.' : 'No pudimos registrar el chat.', code: result.reason, actionable: true }, { status })
  }

  return NextResponse.json({ ok: true, spaceId: spaces[0].space_id, channelCode: result.channelCode, provisioningStatus: result.provisioningStatus, membership: result.membership, reason: result.reason ?? null })
}
