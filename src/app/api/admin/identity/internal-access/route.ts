import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import {
  enrollInternalNativeIdentity,
  revokeInternalNativeIdentity,
  setInternalCapabilityGrant
} from '@/lib/identity/internal-access/commands'
import { internalAccessErrorResponse, requireInternalAccessOperator } from '@/lib/identity/internal-access/http'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body !== 'object' || Array.isArray(body) || !['enroll', 'revoke', 'grant'].includes(body.action))
    return canonicalErrorResponse('auth_server_invalid_request')
  if (body.action === 'grant' && typeof body.active !== 'boolean')
    return canonicalErrorResponse('auth_server_invalid_request')

  const capability =
    body.action === 'enroll'
      ? 'identity.internal_access.enroll'
      : body.action === 'revoke'
        ? 'identity.internal_access.revoke'
        : 'identity.internal_access.grant'

  const { operator, response } = await requireInternalAccessOperator(capability)

  if (!operator) return response

  try {
    const common = { actorId: operator.actorId, reason: String(body.reason ?? ''), dryRun: body.dryRun === true }

    const result =
      body.action === 'enroll'
        ? await enrollInternalNativeIdentity(
            {
              ...common,
              environmentId: String(body.environmentId ?? ''),
              profileId: String(body.profileId ?? ''),
              tenantId: String(body.tenantId ?? ''),
              objectId: String(body.objectId ?? ''),
              issuer: String(body.issuer ?? '')
            },
            operator.dependencies
          )
        : body.action === 'revoke'
          ? await revokeInternalNativeIdentity(
              { ...common, enrollmentId: String(body.enrollmentId ?? '') },
              operator.dependencies
            )
          : await setInternalCapabilityGrant(
              {
                ...common,
                enrollmentId: String(body.enrollmentId ?? ''),
                capability: String(body.capability ?? ''),
                active: body.active === true,
                expiresAt: typeof body.expiresAt === 'string' ? new Date(body.expiresAt) : undefined
              },
              operator.dependencies
            )

    return NextResponse.json(result)
  } catch (error) {
    return internalAccessErrorResponse(error)
  }
}
