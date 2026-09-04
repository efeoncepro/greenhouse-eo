/**
 * Verificación local de un access token emitido por este issuer (TASK-1829): firma con el JWKS
 * publicable (active + retiring), `iss` y `aud`. La usan `revoke` e `introspect`; el gateway verifica
 * por su lado con el JWKS remoto (TASK-1831).
 */

import { createLocalJWKSet, jwtVerify, type JWTPayload } from 'jose'

import { buildPublishedJwks, type SigningKeyRecord } from '../keys'
import type { AuthServerOAuthConfig } from './config'

export type VerifiedAccessToken = {
  jti: string
  sub: string
  azp: string
  scope: string
  gv: number
  exp: number
  iat: number
  aud: string
  iss: string
}

const asString = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null)

export const verifyIssuedAccessToken = async (
  token: string,
  deps: { config: AuthServerOAuthConfig; keys: readonly SigningKeyRecord[]; now?: Date }
): Promise<VerifiedAccessToken | null> => {
  if (deps.keys.length === 0) return null

  const jwks = createLocalJWKSet(buildPublishedJwks(deps.keys))

  let payload: JWTPayload

  try {
    const result = await jwtVerify(token, jwks, {
      issuer: deps.config.issuer,
      audience: deps.config.mcpAudience,
      algorithms: ['ES256'],
      currentDate: deps.now
    })

    payload = result.payload
  } catch {
    return null
  }

  const jti = asString(payload.jti)
  const sub = asString(payload.sub)
  const azp = asString(payload.azp)
  const scope = asString(payload.scope)
  const aud = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud

  if (!jti || !sub || !azp || !scope || typeof payload.gv !== 'number' || !payload.exp || !payload.iat || !aud || !payload.iss) {
    return null
  }

  return { jti, sub, azp, scope, gv: payload.gv, exp: payload.exp, iat: payload.iat, aud, iss: payload.iss }
}
