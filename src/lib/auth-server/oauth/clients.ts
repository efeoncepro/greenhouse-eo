/**
 * Clientes del emisor (TASK-1829): resolución por `client_id` (CIMD → registro persistido), política
 * de redirect por tipo de cliente, autenticación en `token`/`revoke`/`introspect` y el command de
 * clientes confidenciales pre-registrados (capability `auth.client.register`).
 */

import type { AuthServerOAuthConfig } from './config'
import { assertCimdResolved, looksLikeCimdClientId, resolveCimdClient, type CimdDeps } from './cimd'
import { OAuthProtocolError } from './errors'
import {
  generateHexId,
  generateOpaqueToken,
  isLoopbackRedirectUri,
  matchRedirectUri,
  normalizeRegisteredRedirectUris,
  safeEquals,
  sha256Hex,
  type LoopbackHostPolicy
} from './primitives'
import { isKnownScope } from './scopes'
import type { OAuthClientRecord, OAuthStorePort, OAuthTokenEndpointAuthMethod } from './store/port'

export const loopbackPolicyFor = (config: Pick<AuthServerOAuthConfig, 'allowLocalhostAlias'>): LoopbackHostPolicy => ({
  allowLocalhostAlias: config.allowLocalhostAlias,
  allowIpv6Loopback: true
})

/**
 * Política estricta del emisor sobre redirects registrados:
 * - público: TODAS loopback (`http://127.0.0.1:*`, `http://[::1]:*`, alias `localhost` si la config lo permite)
 *   o HTTPS exacto (clientes públicos hospedados, p. ej. `https://claude.ai/api/mcp/auth_callback`);
 * - confidencial: sólo HTTPS exacto.
 */
export const assertRedirectUrisForClientType = (
  redirectUris: readonly string[],
  clientType: OAuthClientRecord['clientType'],
  policy: LoopbackHostPolicy
): string[] => {
  const normalized = normalizeRegisteredRedirectUris(redirectUris)

  if (!normalized.ok) {
    throw new OAuthProtocolError('invalid_redirect_uri', { description: 'redirect_uris invalid', reason: normalized.reason })
  }

  for (const uri of normalized.uris) {
    const parsed = new URL(uri)
    const isHttps = parsed.protocol === 'https:' && !parsed.hash && !parsed.username && !parsed.password
    const isLoopback = isLoopbackRedirectUri(uri, policy)

    if (clientType === 'confidential' && !isHttps) {
      throw new OAuthProtocolError('invalid_redirect_uri', {
        description: 'confidential clients require exact https redirect_uris',
        reason: 'confidential_non_https'
      })
    }

    if (clientType === 'public' && !isHttps && !isLoopback) {
      throw new OAuthProtocolError('invalid_redirect_uri', {
        description: 'public clients require loopback or exact https redirect_uris',
        reason: parsed.hostname === 'localhost' ? 'localhost_by_name' : 'public_non_loopback'
      })
    }
  }

  return normalized.uris
}

/** Resuelve la redirect URI efectiva de un `authorize` contra las registradas del cliente. */
export const resolveAuthorizeRedirectUri = (
  client: OAuthClientRecord,
  requestedRedirectUri: string,
  policy: LoopbackHostPolicy
): string | null => {
  for (const registered of client.redirectUris) {
    if (client.clientType === 'confidential' || registered.startsWith('https://')) {
      if (registered === requestedRedirectUri) return registered

      continue
    }

    const matched = matchRedirectUri({
      clientType: 'public',
      registeredRedirectUri: registered,
      requestedRedirectUri,
      registeredPolicy: policy,
      requestedPolicy: policy
    })

    if (matched) return matched
  }

  return null
}

export type ClientResolverDeps = { store: OAuthStorePort; config: AuthServerOAuthConfig; cimd: Omit<CimdDeps, 'store' | 'cacheTtlSeconds'> }

/** CIMD primero (client_id con forma de URL); después el registro persistido (DCR / pre-registrado). */
export const resolveClient = async (clientId: string, deps: ClientResolverDeps): Promise<OAuthClientRecord> => {
  if (looksLikeCimdClientId(clientId)) {
    const result = await resolveCimdClient(clientId, { ...deps.cimd, store: deps.store, cacheTtlSeconds: deps.config.cimdCacheTtlSeconds })
    const client = assertCimdResolved(result)

    // Persistimos el cliente CIMD para que codes/tokens tengan FK y el admin lo vea; el documento manda.
    const existing = await deps.store.getClient(clientId)

    if (existing?.status === 'suspended' || existing?.status === 'retired') {
      throw new OAuthProtocolError('invalid_client', { description: 'client suspended', reason: `client_${existing.status}` })
    }

    if (!existing || JSON.stringify(existing.redirectUris) !== JSON.stringify(client.redirectUris) || existing.clientName !== client.clientName) {
      await deps.store.upsertClient({ ...client, createdAt: existing?.createdAt ?? client.createdAt })
    }

    return client
  }

  const client = await deps.store.getClient(clientId)

  if (!client) throw new OAuthProtocolError('invalid_client', { description: 'unknown client', reason: 'client_not_found' })

  if (client.status !== 'active') {
    throw new OAuthProtocolError('invalid_client', { description: 'client suspended', reason: `client_${client.status}` })
  }

  return client
}

export const assertScopesAllowedForClient = (client: OAuthClientRecord, scopes: readonly string[]): void => {
  for (const scope of scopes) {
    if (!isKnownScope(scope)) {
      throw new OAuthProtocolError('invalid_scope', { description: `unknown scope`, reason: 'unknown_scope', redirectable: true })
    }

    if (client.allowedScopes && !client.allowedScopes.includes(scope)) {
      throw new OAuthProtocolError('invalid_scope', { description: 'scope not allowed for client', reason: 'scope_not_allowed', redirectable: true })
    }
  }
}

// ─── Autenticación de cliente (token / revoke / introspect) ─────────────────

export type ClientCredentials = {
  clientId: string | null
  clientSecret: string | null
  /** De dónde salió el secret: `basic` (header) o `post` (body). */
  method: 'basic' | 'post' | null
}

export const parseClientCredentials = (input: {
  authorization: string | null | undefined
  bodyClientId: string | null
  bodyClientSecret: string | null
}): ClientCredentials => {
  const header = input.authorization?.trim()

  if (header && /^basic\s+/i.test(header)) {
    const decoded = Buffer.from(header.replace(/^basic\s+/i, ''), 'base64').toString('utf8')
    const separator = decoded.indexOf(':')

    if (separator <= 0) throw new OAuthProtocolError('invalid_client', { description: 'malformed basic credentials', reason: 'basic_malformed' })

    if (input.bodyClientSecret) {
      // RFC 6749 §2.3.1: un solo mecanismo por request.
      throw new OAuthProtocolError('invalid_request', { description: 'multiple client authentication methods', reason: 'multiple_auth_methods' })
    }

    return {
      clientId: decodeURIComponent(decoded.slice(0, separator)),
      clientSecret: decodeURIComponent(decoded.slice(separator + 1)),
      method: 'basic'
    }
  }

  return {
    clientId: input.bodyClientId,
    clientSecret: input.bodyClientSecret,
    method: input.bodyClientSecret ? 'post' : null
  }
}

/** Público: NUNCA manda secret (`none`). Confidencial: secret obligatorio por su método registrado. */
export const authenticateClient = (client: OAuthClientRecord, credentials: ClientCredentials): void => {
  if (client.clientType === 'public') {
    if (credentials.clientSecret) {
      throw new OAuthProtocolError('invalid_client', { description: 'public client must not send a secret', reason: 'public_with_secret' })
    }

    return
  }

  const expectedMethod: OAuthTokenEndpointAuthMethod = client.tokenEndpointAuthMethod
  const presented = credentials.method === 'basic' ? 'client_secret_basic' : credentials.method === 'post' ? 'client_secret_post' : null

  if (!credentials.clientSecret || !client.clientSecretHash || presented !== expectedMethod) {
    throw new OAuthProtocolError('invalid_client', { description: 'client authentication failed', reason: 'secret_missing_or_method' })
  }

  if (!safeEquals(sha256Hex(credentials.clientSecret), client.clientSecretHash)) {
    throw new OAuthProtocolError('invalid_client', { description: 'client authentication failed', reason: 'secret_mismatch' })
  }
}

// ─── Command: cliente confidencial pre-registrado ───────────────────────────

export type RegisterConfidentialClientInput = {
  clientName: string
  redirectUris: readonly string[]
  tokenEndpointAuthMethod?: 'client_secret_basic' | 'client_secret_post'
  allowedScopes?: readonly string[] | null
  actor: string
  /** Idempotencia: mismo `clientId` explícito ⇒ mismo registro (sin re-emitir secret). */
  clientId?: string
}

export type RegisterConfidentialClientResult = {
  client: OAuthClientRecord
  /** Sólo se devuelve en la creación; después es irrecuperable (sólo el hash persiste). */
  clientSecret: string | null
  created: boolean
}

export const registerConfidentialClient = async (
  input: RegisterConfidentialClientInput,
  deps: { store: OAuthStorePort; config: AuthServerOAuthConfig; now?: () => Date }
): Promise<RegisterConfidentialClientResult> => {
  const now = (deps.now ?? (() => new Date()))()
  const clientName = input.clientName.trim()

  if (clientName.length < 3 || clientName.length > 200) {
    throw new OAuthProtocolError('invalid_client_metadata', { description: 'client_name length', reason: 'client_name_length' })
  }

  const redirectUris = assertRedirectUrisForClientType(input.redirectUris, 'confidential', loopbackPolicyFor(deps.config))

  if (input.allowedScopes) {
    for (const scope of input.allowedScopes) {
      if (!isKnownScope(scope)) throw new OAuthProtocolError('invalid_scope', { description: 'unknown scope', reason: 'unknown_scope' })
    }
  }

  const clientId = input.clientId?.trim() || `efeonce-client-${generateHexId(12)}`

  if (!/^[a-z0-9][a-z0-9._-]{2,127}$/.test(clientId)) {
    throw new OAuthProtocolError('invalid_client_metadata', { description: 'client_id format', reason: 'client_id_format' })
  }

  const existing = await deps.store.getClient(clientId)

  if (existing) {
    if (existing.registrationKind !== 'preregistered') {
      throw new OAuthProtocolError('invalid_client_metadata', { description: 'client_id taken', reason: 'client_id_taken' })
    }

    return { client: existing, clientSecret: null, created: false }
  }

  const clientSecret = generateOpaqueToken('efs', 32)

  const client: OAuthClientRecord = {
    clientId,
    registrationKind: 'preregistered',
    clientType: 'confidential',
    clientName,
    redirectUris,
    grantTypes: ['authorization_code', 'refresh_token'],
    responseTypes: ['code'],
    tokenEndpointAuthMethod: input.tokenEndpointAuthMethod ?? 'client_secret_basic',
    clientSecretHash: sha256Hex(clientSecret),
    allowedScopes: input.allowedScopes ? [...input.allowedScopes] : null,
    status: 'active',
    metadata: { registeredBy: input.actor },
    createdBy: input.actor,
    createdAt: now,
    updatedAt: now
  }

  await deps.store.upsertClient(client)

  return { client, clientSecret, created: true }
}
