import { NextResponse } from 'next/server'

import { issueExternalInvitation } from '@/lib/identity/external-access'
import {
  externalAccessErrorResponse,
  readJsonBody,
  requireExternalAccessOperator
} from '@/lib/identity/external-access/http'

export const dynamic = 'force-dynamic'

/**
 * TASK-1631 — Emitir una invitación auditada a una persona de la organización ligada.
 * `identity.external_invitation.issue`. El token viaja UNA vez en esta respuesta (`token`) y nunca se
 * persiste en claro; con una invitación abierta ya existente responde 200 sin token salvo `reissue`.
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

    return NextResponse.json(result, { status: result.created ? 201 : 200 })
  } catch (error) {
    return externalAccessErrorResponse(error, 'admin.external-access.invitations.issue')
  }
}
