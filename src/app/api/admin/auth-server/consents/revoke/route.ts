import { NextResponse } from 'next/server'

import { asStringArray, authServerErrorResponse, readJsonBody, requireAuthServerOperator } from '@/lib/auth-server/oauth/admin-http'
import { readAuthServerOAuthConfig } from '@/lib/auth-server/oauth/config'
import { revokeClientConsent } from '@/lib/auth-server/oauth/consent'
import { PostgresOAuthStore } from '@/lib/auth-server/oauth/store/postgres-store'

export const dynamic = 'force-dynamic'

/**
 * TASK-1829 — Revocar el consentimiento OAuth de un sujeto para un cliente (todos los scopes o una
 * lista) y, en la misma llamada, todas sus familias de tokens vivas. Capability
 * `identity.auth_consent.revoke` (EFEONCE_ADMIN). Idempotente y auditado (`consent_revoked`).
 */
export async function POST(request: Request) {
  const { operator, response } = await requireAuthServerOperator('identity.auth_consent.revoke', 'execute')

  if (!operator) return response

  try {
    const body = await readJsonBody(request)
    const config = readAuthServerOAuthConfig()

    const result = await revokeClientConsent(
      {
        subject: String(body.subject ?? ''),
        environmentId: typeof body.environmentId === 'string' && body.environmentId ? body.environmentId : config.environmentId,
        clientId: String(body.clientId ?? ''),
        scopes: body.scopes === undefined || body.scopes === null ? null : asStringArray(body.scopes),
        reason: String(body.reason ?? ''),
        actor: operator.actor.actorId,
        via: 'admin'
      },
      { store: new PostgresOAuthStore() }
    )

    return NextResponse.json(result)
  } catch (error) {
    return authServerErrorResponse(error, 'admin.auth-server.consents.revoke')
  }
}
