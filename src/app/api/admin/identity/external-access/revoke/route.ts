import { NextResponse } from 'next/server'

import { ExternalAccessError, revokeExternalAccess, type RevokeExternalAccessInput } from '@/lib/identity/external-access'
import {
  externalAccessErrorResponse,
  readJsonBody,
  requireExternalAccessOperator
} from '@/lib/identity/external-access/http'

export const dynamic = 'force-dynamic'

const parseRevocation = (body: Record<string, unknown>): RevokeExternalAccessInput => {
  const reason = String(body.reason ?? '')

  switch (body.scope) {
    case 'binding':
      return { scope: 'binding', bindingId: String(body.bindingId ?? ''), reason }
    case 'grant':
      return { scope: 'grant', grantId: String(body.grantId ?? ''), reason }
    case 'member':
      return { scope: 'member', bindingId: String(body.bindingId ?? ''), profileId: String(body.profileId ?? ''), reason }
    case 'invitation':
      return { scope: 'invitation', invitationId: String(body.invitationId ?? ''), reason }
    default:
      throw new ExternalAccessError('invalid_request', 'scope must be binding, grant, member or invitation', {
        field: 'scope'
      })
  }
}

/**
 * TASK-1631 — Revocación auditada (binding | grant | member | invitation).
 * `identity.external_access.revoke`. Idempotente; sube `grants_version` cuando cambia autoridad, así
 * el gateway deniega tokens vigentes en el siguiente recheck (fail-closed, < 5 min).
 */
export async function POST(request: Request) {
  const { operator, response } = await requireExternalAccessOperator('identity.external_access.revoke', 'execute')

  if (!operator) return response

  try {
    const body = await readJsonBody(request)
    const result = await revokeExternalAccess(parseRevocation(body), operator.actor)

    return NextResponse.json(result)
  } catch (error) {
    return externalAccessErrorResponse(error, 'admin.external-access.revoke')
  }
}
