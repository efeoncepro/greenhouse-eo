import { NextResponse } from 'next/server'

import { grantExternalCapability } from '@/lib/identity/external-access'
import {
  externalAccessErrorResponse,
  readJsonBody,
  requireExternalAccessOperator
} from '@/lib/identity/external-access/http'

export const dynamic = 'force-dynamic'

/**
 * TASK-1631 — Otorgar una capability namespaceada al binding (o a una persona ya ligada).
 * `identity.external_grant.issue`. Idempotente; sube `grants_version` cuando crea.
 */
export async function POST(request: Request, { params }: { params: Promise<{ bindingId: string }> }) {
  const { operator, response } = await requireExternalAccessOperator('identity.external_grant.issue', 'create')

  if (!operator) return response

  try {
    const { bindingId } = await params
    const body = await readJsonBody(request)

    const result = await grantExternalCapability(
      {
        bindingId,
        capability: String(body.capability ?? ''),
        profileId: typeof body.profileId === 'string' ? body.profileId : null,
        reason: typeof body.reason === 'string' ? body.reason : null
      },
      operator.actor
    )

    return NextResponse.json(result, { status: result.created ? 201 : 200 })
  } catch (error) {
    return externalAccessErrorResponse(error, 'admin.external-access.grants.issue')
  }
}
