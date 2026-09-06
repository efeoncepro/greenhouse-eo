import { NextResponse } from 'next/server'

import { createExternalCanaryFixture, listExternalCanaryRegistrations } from '@/lib/identity/external-access'
import {
  externalAccessErrorResponse,
  readJsonBody,
  requireExternalAccessOperator
} from '@/lib/identity/external-access/http'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { operator, response } = await requireExternalAccessOperator('identity.external_binding.read', 'read')

  if (!operator) return response

  try {
    const url = new URL(request.url)
    const rawStatus = url.searchParams.get('status')
    const status = rawStatus === 'active' || rawStatus === 'revoked' ? rawStatus : null
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 500)
    const items = await listExternalCanaryRegistrations({ status, limit })

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    return externalAccessErrorResponse(error, 'admin.external-access.canaries.list')
  }
}

export async function POST(request: Request) {
  const { operator, response } = await requireExternalAccessOperator('identity.external_canary.register', 'create')

  if (!operator) return response

  try {
    const body = await readJsonBody(request)

    const result = await createExternalCanaryFixture(
      {
        runId: String(body.runId ?? ''),
        canaryRegistrationId: String(body.canaryRegistrationId ?? ''),
        organizationId: String(body.organizationId ?? ''),
        organizationPublicId: String(body.organizationPublicId ?? ''),
        environmentId: String(body.environmentId ?? ''),
        externalOrganizationRef: String(body.externalOrganizationRef ?? ''),
        expiresAt: String(body.expiresAt ?? ''),
        reason: String(body.reason ?? '')
      },
      operator.actor
    )

    return NextResponse.json(result, { status: result.created ? 201 : 200 })
  } catch (error) {
    return externalAccessErrorResponse(error, 'admin.external-access.canaries.create')
  }
}
