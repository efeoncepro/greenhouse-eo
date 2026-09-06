import { NextResponse } from 'next/server'

import { issueExternalInvitation, type IssueExternalInvitationResult } from '@/lib/identity/external-access'
import {
  externalAccessErrorResponse,
  readJsonBody,
  requireExternalAccessOperator
} from '@/lib/identity/external-access/http'

export const dynamic = 'force-dynamic'

/**
 * Contrato de respuesta de la emisión (TASK-1837). Con entrega del sistema (`delivery.mode='system'`)
 * el campo `token` NO EXISTE: el secreto viajó una vez en el correo y nadie de Efeonce lo ve. Sólo con
 * el flag apagado (`mode='manual'`, comportamiento previo) el token vuelve al operador.
 * Guard de regresión: `route.test.ts`.
 */
export type IssueExternalInvitationResponse = {
  invitation: IssueExternalInvitationResult['invitation']
  created: boolean
  delivery: IssueExternalInvitationResult['delivery']
  token?: string | null
}

export const buildIssueExternalInvitationResponse = (
  result: IssueExternalInvitationResult
): IssueExternalInvitationResponse => {
  const base = { invitation: result.invitation, created: result.created, delivery: result.delivery }

  return result.delivery.mode === 'manual' ? { ...base, token: result.token } : base
}

/**
 * TASK-1631 — Emitir una invitación auditada a una persona de la organización ligada.
 * `identity.external_invitation.issue`. TASK-1837: el sistema entrega el correo en el mismo acto y la
 * respuesta describe la ENTREGA (`delivery`), nunca el secreto; un envío fallido responde honesto
 * (`delivery.status='failed'`) en vez de "listo".
 */
export async function POST(request: Request, { params }: { params: Promise<{ bindingId: string }> }) {
  const { operator, response } = await requireExternalAccessOperator('identity.external_invitation.issue', 'create')

  if (!operator) return response

  try {
    const { bindingId } = await params
    const body = await readJsonBody(request)

    const result = await issueExternalInvitation(
      {
        bindingId,
        email: String(body.email ?? ''),
        designatedAdmin: body.designatedAdmin === true,
        profileId: typeof body.profileId === 'string' ? body.profileId : null,
        reason: typeof body.reason === 'string' ? body.reason : null,
        expiresInHours: typeof body.expiresInHours === 'number' ? body.expiresInHours : null,
        reissue: body.reissue === true
      },
      operator.actor
    )

    return NextResponse.json(buildIssueExternalInvitationResponse(result), { status: result.created ? 201 : 200 })
  } catch (error) {
    return externalAccessErrorResponse(error, 'admin.external-access.invitations.issue')
  }
}
