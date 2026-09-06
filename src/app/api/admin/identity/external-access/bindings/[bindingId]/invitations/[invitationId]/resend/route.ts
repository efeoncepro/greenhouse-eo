import { NextResponse } from 'next/server'

import { resendExternalInvitation } from '@/lib/identity/external-access'
import {
  externalAccessErrorResponse,
  readJsonBody,
  requireExternalAccessOperator
} from '@/lib/identity/external-access/http'

import { buildIssueExternalInvitationResponse } from '../../route'

export const dynamic = 'force-dynamic'

/**
 * TASK-1837 — Reenviar una invitación abierta: ROTA el token (la anterior queda revocada `resent`) y
 * el sistema entrega el correo nuevo. Misma capability que emitir (`identity.external_invitation.issue`):
 * reenviar es emitir de nuevo. Topes: 3 por cadena + 20 por binding/hora (429). El `bindingId` de la
 * ruta debe coincidir con el de la invitación (404 anti-oráculo si no).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bindingId: string; invitationId: string }> }
) {
  const { operator, response } = await requireExternalAccessOperator('identity.external_invitation.issue', 'create')

  if (!operator) return response

  try {
    const { bindingId, invitationId } = await params
    const body = await readJsonBody(request)

    const result = await resendExternalInvitation(
      {
        invitationId,
        bindingId,
        reason: typeof body.reason === 'string' ? body.reason : null,
        expiresInHours: typeof body.expiresInHours === 'number' ? body.expiresInHours : null
      },
      operator.actor
    )

    return NextResponse.json(buildIssueExternalInvitationResponse(result), { status: 201 })
  } catch (error) {
    return externalAccessErrorResponse(error, 'admin.external-access.invitations.resend')
  }
}
