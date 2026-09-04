import { NextResponse } from 'next/server'

import { asStringArray, authServerErrorResponse, readJsonBody, requireAuthServerOperator } from '@/lib/auth-server/oauth/admin-http'
import { registerConfidentialClient } from '@/lib/auth-server/oauth/clients'
import { readAuthServerOAuthConfig } from '@/lib/auth-server/oauth/config'
import { PostgresOAuthStore } from '@/lib/auth-server/oauth/store/postgres-store'

export const dynamic = 'force-dynamic'

/**
 * TASK-1829 — Registrar un cliente OAuth CONFIDENCIAL pre-registrado en el emisor `auth.efeonce.org`.
 * Capability `identity.auth_client.register` (EFEONCE_ADMIN). Mismo command que la CLI
 * `pnpm auth-server:register-client`. El `client_secret` viaja UNA sola vez en la respuesta de creación.
 */
export async function POST(request: Request) {
  const { operator, response } = await requireAuthServerOperator('identity.auth_client.register', 'execute')

  if (!operator) return response

  try {
    const body = await readJsonBody(request)
    const authMethod = body.tokenEndpointAuthMethod

    const result = await registerConfidentialClient(
      {
        clientName: String(body.clientName ?? ''),
        redirectUris: asStringArray(body.redirectUris),
        tokenEndpointAuthMethod:
          authMethod === 'client_secret_post' || authMethod === 'client_secret_basic' ? authMethod : undefined,
        allowedScopes: body.allowedScopes === undefined || body.allowedScopes === null ? null : asStringArray(body.allowedScopes),
        clientId: typeof body.clientId === 'string' ? body.clientId : undefined,
        actor: operator.actor.actorId
      },
      { store: new PostgresOAuthStore(), config: readAuthServerOAuthConfig() }
    )

    return NextResponse.json(
      {
        created: result.created,
        client: {
          clientId: result.client.clientId,
          clientName: result.client.clientName,
          redirectUris: result.client.redirectUris,
          tokenEndpointAuthMethod: result.client.tokenEndpointAuthMethod,
          allowedScopes: result.client.allowedScopes,
          status: result.client.status
        },
        clientSecret: result.clientSecret
      },
      { status: result.created ? 201 : 200 }
    )
  } catch (error) {
    return authServerErrorResponse(error, 'admin.auth-server.oauth-clients.register')
  }
}
