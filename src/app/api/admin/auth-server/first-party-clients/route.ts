import { NextResponse } from 'next/server'

import { parseFirstPartyRegistration } from '@/lib/auth-server/first-party/admin-input'
import { PostgresFirstPartyStore } from '@/lib/auth-server/first-party/postgres-store'
import { registerFirstPartyClient } from '@/lib/auth-server/first-party/registry'
import { authServerErrorResponse, readJsonBody, requireAuthServerOperator } from '@/lib/auth-server/oauth/admin-http'

export const dynamic = 'force-dynamic'

/** Governed registration only; DCR and CIMD cannot enter this lane. */
export async function POST(request: Request) {
  const { operator, response } = await requireAuthServerOperator('identity.auth_client.register', 'execute')

  if (!operator) return response

  try {
    const input = parseFirstPartyRegistration(await readJsonBody(request), operator.actor.actorId)
    const result = await registerFirstPartyClient(input, { store: new PostgresFirstPartyStore() })

    const client = {
      clientId: result.client.clientId,
      product: result.client.product,
      redirectUris: result.client.redirectUris,
      tokenEndpointAuthMethod: result.client.tokenEndpointAuthMethod,
      status: result.client.status,
      allowLocalDevelopment: result.client.allowLocalDevelopment,
      sessionMaxAgeSeconds: result.client.sessionMaxAgeSeconds
    }

    return NextResponse.json(
      { created: result.created, client, clientSecret: result.clientSecret },
      { status: result.created ? 201 : 200, headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' } }
    )
  } catch (error) {
    return authServerErrorResponse(error, 'admin.auth-server.first-party-clients.register')
  }
}
