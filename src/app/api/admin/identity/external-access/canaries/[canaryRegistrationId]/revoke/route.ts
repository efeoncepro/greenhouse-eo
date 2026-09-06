import { NextResponse } from 'next/server'

import { revokeExternalCanaryFixture } from '@/lib/identity/external-access'
import {
  externalAccessErrorResponse,
  readJsonBody,
  requireExternalAccessOperator
} from '@/lib/identity/external-access/http'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ canaryRegistrationId: string }> }
) {
  const { operator, response } = await requireExternalAccessOperator('identity.external_canary.revoke', 'execute')

  if (!operator) return response

  try {
    const { canaryRegistrationId } = await params
    const body = await readJsonBody(request)

    const result = await revokeExternalCanaryFixture(
      { canaryRegistrationId, reason: String(body.reason ?? '') },
      operator.actor
    )

    return NextResponse.json(result)
  } catch (error) {
    return externalAccessErrorResponse(error, 'admin.external-access.canaries.revoke')
  }
}
