import { NextResponse } from 'next/server'

import { revealExternalInvitationToken } from '@/lib/identity/external-access'
import {
  externalAccessErrorResponse,
  readJsonBody,
  requireExternalAccessOperator
} from '@/lib/identity/external-access/http'

export const dynamic = 'force-dynamic'

/**
 * TASK-1837 — Excepción gobernada: `identity.external_invitation.reveal_token` + razón ≥ 10 chars.
 * Rota la invitación abierta a un enlace de 1 hora y lo devuelve UNA vez, sin enviar correo.
 * Pensado para la persona sin correo operativo, no para el flujo normal: el acto queda auditado
 * (actor, razón, invitation_id; nunca el token) y enciende `identity.external_invitation.token_revealed`.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bindingId: string; invitationId: string }> }
) {
  const { operator, response } = await requireExternalAccessOperator(
    'identity.external_invitation.reveal_token',
    'execute'
  )

  if (!operator) return response

  try {
    const { bindingId, invitationId } = await params
    const body = await readJsonBody(request)

    const result = await revealExternalInvitationToken(
      { invitationId, bindingId, reason: typeof body.reason === 'string' ? body.reason : '' },
      operator.actor
    )

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return externalAccessErrorResponse(error, 'admin.external-access.invitations.reveal')
  }
}
