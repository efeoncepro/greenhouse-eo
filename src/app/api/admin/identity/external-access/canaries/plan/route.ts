import { NextResponse } from 'next/server'

import { planExternalCanaryFixture } from '@/lib/identity/external-access'
import {
  externalAccessErrorResponse,
  readJsonBody,
  requireExternalAccessOperator
} from '@/lib/identity/external-access/http'

export const dynamic = 'force-dynamic'

/** Genera IDs sin tocar la base para que el manifiesto exista antes del primer write. */
export async function POST(request: Request) {
  const { operator, response } = await requireExternalAccessOperator('identity.external_canary.register', 'create')

  if (!operator) return response

  try {
    const body = await readJsonBody(request)

    return NextResponse.json(planExternalCanaryFixture(String(body.runId ?? '')))
  } catch (error) {
    return externalAccessErrorResponse(error, 'admin.external-access.canaries.plan')
  }
}
