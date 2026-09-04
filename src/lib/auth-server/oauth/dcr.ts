/**
 * Dynamic Client Registration (RFC 7591) — compatibilidad mientras los clientes la usen (TASK-1829).
 *
 * CIMD es el mecanismo primario (`client_id_metadata_document_supported: true`); DCR queda porque los
 * clientes MCP actuales (Claude Code, claude.ai, Claude Desktop) todavía lo piden. Sólo registra
 * clientes PÚBLICOS (`token_endpoint_auth_method: none`) con la política de redirects del emisor.
 * El registro es abierto (sin initial access token) y por eso está rate-limited por IP.
 */

import { OAuthProtocolError } from './errors'
import { assertRedirectUrisForClientType, loopbackPolicyFor } from './clients'
import type { AuthServerOAuthConfig } from './config'
import { generateOpaqueId } from './primitives'
import { isKnownScope } from './scopes'
import type { OAuthClientRecord, OAuthStorePort } from './store/port'

export type DcrResponse = {
  client_id: string
  client_id_issued_at: number
  client_name: string
  redirect_uris: string[]
  token_endpoint_auth_method: 'none'
  grant_types: string[]
  response_types: string[]
  scope?: string
  application_type?: string
}

const asStringArray = (value: unknown): string[] | null =>
  Array.isArray(value) && value.every(item => typeof item === 'string') ? (value as string[]) : null

export const registerDynamicClient = async (
  raw: unknown,
  deps: { store: OAuthStorePort; config: AuthServerOAuthConfig; now?: () => Date }
): Promise<DcrResponse> => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new OAuthProtocolError('invalid_client_metadata', { description: 'body must be a JSON object', reason: 'not_object' })
  }

  const body = raw as Record<string, unknown>
  const now = (deps.now ?? (() => new Date()))()

  const redirectUris = asStringArray(body.redirect_uris)

  if (!redirectUris || redirectUris.length === 0) {
    throw new OAuthProtocolError('invalid_redirect_uri', { description: 'redirect_uris required', reason: 'redirect_uris_missing' })
  }

  const authMethod = body.token_endpoint_auth_method ?? 'none'

  if (authMethod !== 'none') {
    throw new OAuthProtocolError('invalid_client_metadata', {
      description: 'only token_endpoint_auth_method "none" is supported by dynamic registration',
      reason: 'auth_method_not_none'
    })
  }

  const grantTypes = body.grant_types === undefined ? ['authorization_code'] : asStringArray(body.grant_types)

  if (!grantTypes || !grantTypes.includes('authorization_code') || grantTypes.some(g => g !== 'authorization_code' && g !== 'refresh_token')) {
    throw new OAuthProtocolError('invalid_client_metadata', { description: 'unsupported grant_types', reason: 'grant_types' })
  }

  const responseTypes = body.response_types === undefined ? ['code'] : asStringArray(body.response_types)

  if (!responseTypes || !responseTypes.includes('code') || responseTypes.some(r => r !== 'code')) {
    throw new OAuthProtocolError('invalid_client_metadata', { description: 'unsupported response_types', reason: 'response_types' })
  }

  if (body.client_name !== undefined && typeof body.client_name !== 'string') {
    throw new OAuthProtocolError('invalid_client_metadata', { description: 'client_name must be a string', reason: 'client_name_type' })
  }

  const clientName = (typeof body.client_name === 'string' ? body.client_name : '').trim().slice(0, 200) || 'Dynamic client'

  let requestedScopes: string[] | null = null

  if (body.scope !== undefined) {
    if (typeof body.scope !== 'string') {
      throw new OAuthProtocolError('invalid_client_metadata', { description: 'scope must be a string', reason: 'scope_type' })
    }

    requestedScopes = body.scope.split(/\s+/).filter(Boolean)

    for (const scope of requestedScopes) {
      if (!isKnownScope(scope)) throw new OAuthProtocolError('invalid_client_metadata', { description: 'unknown scope', reason: 'unknown_scope' })
    }
  }

  const uris = assertRedirectUrisForClientType(redirectUris, 'public', loopbackPolicyFor(deps.config))
  const clientId = `dcr-${generateOpaqueId(16)}`

  const client: OAuthClientRecord = {
    clientId,
    registrationKind: 'dcr',
    clientType: 'public',
    clientName,
    redirectUris: uris,
    grantTypes,
    responseTypes,
    tokenEndpointAuthMethod: 'none',
    clientSecretHash: null,
    allowedScopes: requestedScopes && requestedScopes.length > 0 ? requestedScopes : null,
    status: 'active',
    metadata: {
      dcr: {
        software_id: typeof body.software_id === 'string' ? body.software_id.slice(0, 200) : null,
        software_version: typeof body.software_version === 'string' ? body.software_version.slice(0, 100) : null,
        application_type: typeof body.application_type === 'string' ? body.application_type.slice(0, 32) : null,
        client_uri: typeof body.client_uri === 'string' ? body.client_uri.slice(0, 500) : null
      }
    },
    createdBy: 'dcr',
    createdAt: now,
    updatedAt: now
  }

  await deps.store.upsertClient(client)

  return {
    client_id: clientId,
    client_id_issued_at: Math.floor(now.getTime() / 1000),
    client_name: clientName,
    redirect_uris: uris,
    token_endpoint_auth_method: 'none',
    grant_types: grantTypes,
    response_types: responseTypes,
    ...(requestedScopes && requestedScopes.length > 0 ? { scope: requestedScopes.join(' ') } : {}),
    ...(typeof body.application_type === 'string' ? { application_type: body.application_type.slice(0, 32) } : {})
  }
}
