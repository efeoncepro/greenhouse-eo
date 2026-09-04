import { NextResponse } from 'next/server'

import { listExternalIdentityEnvironments, upsertExternalIdentityEnvironment } from '@/lib/identity/external-access'
import {
  externalAccessErrorResponse,
  readJsonBody,
  requireExternalAccessOperator
} from '@/lib/identity/external-access/http'

export const dynamic = 'force-dynamic'

/**
 * TASK-1631 — Registry de environments de identidad externa (issuer, JWKS, audience, clase).
 * GET  → `identity.external_binding.read`
 * POST → `identity.external_environment.manage` (upsert idempotente; la clase no cambia en caliente)
 */
export async function GET() {
  const { operator, response } = await requireExternalAccessOperator('identity.external_binding.read', 'read')

  if (!operator) return response

  try {
    const items = await listExternalIdentityEnvironments()

    return NextResponse.json({ items, total: items.length })
  } catch (error) {
    return externalAccessErrorResponse(error, 'admin.external-access.environments.list')
  }
}

export async function POST(request: Request) {
  const { operator, response } = await requireExternalAccessOperator('identity.external_environment.manage', 'update')

  if (!operator) return response

  try {
    const body = await readJsonBody(request)

    const result = await upsertExternalIdentityEnvironment(
      {
        environmentId: String(body.environmentId ?? ''),
        displayName: String(body.displayName ?? ''),
        provider: String(body.provider ?? ''),
        providerEnvironmentRef: typeof body.providerEnvironmentRef === 'string' ? body.providerEnvironmentRef : null,
        issuerUrl: String(body.issuerUrl ?? ''),
        jwksUri: String(body.jwksUri ?? ''),
        audience: String(body.audience ?? ''),
        issuerClass: String(body.issuerClass ?? ''),
        subjectType: typeof body.subjectType === 'string' ? body.subjectType : null,
        status: typeof body.status === 'string' ? body.status : null,
        notes: typeof body.notes === 'string' ? body.notes : null
      },
      operator.actor
    )

    return NextResponse.json(result, { status: result.created ? 201 : 200 })
  } catch (error) {
    return externalAccessErrorResponse(error, 'admin.external-access.environments.upsert')
  }
}
